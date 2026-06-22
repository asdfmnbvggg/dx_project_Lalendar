#!/usr/bin/env python3
"""Validate, clean, fine-tune, and evaluate Qwen/Together JSONL data.

This script intentionally uses only the Python standard library so it can run in
the project without installing extra packages.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import sys
import time
import traceback
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
TRAIN_PATH = ROOT / "train.jsonl"
VALID_PATH = ROOT / "valid.jsonl"
TRAIN_CLEAN_PATH = ROOT / "train_clean.jsonl"
VALID_CLEAN_PATH = ROOT / "valid_clean.jsonl"
REPORT_PATH = ROOT / "qwen_finetune_report.md"
SUMMARY_CSV_PATH = ROOT / "qwen_finetune_result_summary.csv"
PREDICTIONS_CSV_PATH = ROOT / "qwen_finetune_predictions.csv"
RUN_STATE_PATH = ROOT / "qwen_finetune_run_state.json"

INPUT_FIELDS = [
    "event_title",
    "event_date",
    "event_start_time",
    "event_end_time",
    "day_temp",
    "day_humidity",
    "day_dust",
]
OUTPUT_FIELDS = [
    "task_appliance",
    "task_appliance_mode",
    "task_date",
    "task_start_time",
    "task_end_time",
]
EXPECTED_ROLES = ["system", "user", "assistant"]
DEFAULT_BASE_MODEL = "Qwen/Qwen2.5-7B-Instruct"
DEFAULT_EPOCHS = 3
DEFAULT_LEARNING_RATE = 0.00001
DEFAULT_BATCH_SIZE = 4
SYSTEM_PROMPT_KO = "Lalendar 앱에서 일정+날씨를 보고 추천 가전 작업 예측"


def now_iso() -> str:
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def read_text_lossless(path: Path) -> tuple[str, str, list[str]]:
    errors: list[str] = []
    raw = path.read_bytes()
    for encoding in ("utf-8-sig", "utf-8"):
        try:
            return raw.decode(encoding), encoding, errors
        except UnicodeDecodeError as exc:
            errors.append(f"{encoding} decode failed: {exc}")
    for encoding in ("cp949", "euc-kr"):
        try:
            return raw.decode(encoding), encoding, errors
        except UnicodeDecodeError as exc:
            errors.append(f"{encoding} decode failed: {exc}")
    return raw.decode("utf-8", errors="replace"), "utf-8-replace", errors


def suspicious_count(text: str) -> int:
    count = text.count("\ufffd")
    count += text.count("?")
    for ch in text:
        code = ord(ch)
        if 0x4E00 <= code <= 0x9FFF:
            count += 1
    return count


def hangul_count(text: str) -> int:
    return sum(1 for ch in text if 0xAC00 <= ord(ch) <= 0xD7A3)


def repair_text(text: str) -> tuple[str, bool]:
    candidates = [text]
    for enc in ("cp949", "euc-kr", "latin1"):
        try:
            candidates.append(text.encode(enc).decode("utf-8"))
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

    def score(value: str) -> int:
        return hangul_count(value) * 5 - suspicious_count(value) * 4 - value.count("\\u") * 2

    best = max(candidates, key=score)
    if best != text and score(best) > score(text):
        return best, True
    return text, False


def repair_obj(value: Any) -> tuple[Any, int]:
    if isinstance(value, str):
        repaired, changed = repair_text(value)
        return repaired, int(changed)
    if isinstance(value, list):
        out = []
        changes = 0
        for item in value:
            fixed, cnt = repair_obj(item)
            out.append(fixed)
            changes += cnt
        return out, changes
    if isinstance(value, dict):
        out = {}
        changes = 0
        for key, item in value.items():
            fixed_key, key_cnt = repair_obj(key)
            fixed_item, item_cnt = repair_obj(item)
            out[fixed_key] = fixed_item
            changes += key_cnt + item_cnt
        return out, changes
    return value, 0


def extract_json_from_user(content: str) -> dict[str, Any] | None:
    match = re.search(r"Input X:\s*(\{.*?\})\s*Predict Y", content, re.S)
    if not match:
        return None
    return json.loads(match.group(1))


def parse_assistant_json(content: str) -> dict[str, Any] | None:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.S)
        if not match:
            return None
        return json.loads(match.group(0))


def validate_record(obj: Any) -> tuple[list[str], dict[str, Any] | None, dict[str, Any] | None]:
    problems: list[str] = []
    x_obj = None
    y_obj = None
    if not isinstance(obj, dict):
        return ["top-level JSON is not an object"], None, None
    messages = obj.get("messages")
    if not isinstance(messages, list):
        return ["missing or non-list messages"], None, None
    if len(messages) != 3:
        problems.append(f"messages length is {len(messages)}, expected 3")
    roles = [m.get("role") if isinstance(m, dict) else None for m in messages]
    if roles != EXPECTED_ROLES:
        problems.append(f"roles are {roles}, expected {EXPECTED_ROLES}")
    for i, message in enumerate(messages):
        if not isinstance(message, dict):
            problems.append(f"messages[{i}] is not an object")
            continue
        if not isinstance(message.get("content"), str):
            problems.append(f"messages[{i}].content is not a string")
    try:
        if len(messages) > 1 and isinstance(messages[1], dict):
            x_obj = extract_json_from_user(messages[1].get("content", ""))
    except Exception as exc:
        problems.append(f"user Input X JSON parse failed: {exc}")
    if x_obj is None:
        problems.append("user Input X JSON not found")
    else:
        missing = [field for field in INPUT_FIELDS if field not in x_obj]
        if missing:
            problems.append(f"Input X missing fields: {missing}")
    try:
        if len(messages) > 2 and isinstance(messages[2], dict):
            y_obj = parse_assistant_json(messages[2].get("content", ""))
    except Exception as exc:
        problems.append(f"assistant Y JSON parse failed: {exc}")
    if y_obj is None:
        problems.append("assistant Y JSON not found")
    else:
        missing = [field for field in OUTPUT_FIELDS if field not in y_obj]
        extra = [field for field in y_obj if field not in OUTPUT_FIELDS]
        if missing:
            problems.append(f"Y missing fields: {missing}")
        if extra:
            problems.append(f"Y has extra fields: {extra}")
    return problems, x_obj, y_obj


def validate_and_clean(src: Path, dst: Path) -> dict[str, Any]:
    text, encoding, decode_errors = read_text_lossless(src)
    stats: dict[str, Any] = {
        "source": str(src),
        "clean": str(dst),
        "bytes": src.stat().st_size,
        "modified": dt.datetime.fromtimestamp(src.stat().st_mtime).astimezone().isoformat(timespec="seconds"),
        "detected_encoding": encoding,
        "decode_errors": decode_errors,
        "line_count": 0,
        "json_ok": 0,
        "json_errors": [],
        "message_ok": 0,
        "message_errors": [],
        "text_repairs": 0,
        "replacement_char_count": text.count("\ufffd"),
        "suspicious_char_count": suspicious_count(text),
    }
    cleaned_lines: list[str] = []
    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        if not raw_line.strip():
            continue
        stats["line_count"] += 1
        try:
            obj = json.loads(raw_line)
            stats["json_ok"] += 1
        except json.JSONDecodeError as exc:
            stats["json_errors"].append({"line": line_no, "error": str(exc)})
            continue
        fixed_obj, repair_count = repair_obj(obj)
        stats["text_repairs"] += repair_count
        problems, _, _ = validate_record(fixed_obj)
        if problems:
            stats["message_errors"].append({"line": line_no, "problems": problems})
        else:
            stats["message_ok"] += 1
        cleaned_lines.append(json.dumps(fixed_obj, ensure_ascii=False, separators=(",", ":")))
    dst.write_text("\n".join(cleaned_lines) + ("\n" if cleaned_lines else ""), encoding="utf-8")
    return stats


def load_records(path: Path) -> list[dict[str, Any]]:
    records = []
    text, _, _ = read_text_lossless(path)
    for raw_line in text.splitlines():
        if raw_line.strip():
            records.append(json.loads(raw_line))
    return records


def prompt_from_record(record: dict[str, Any]) -> tuple[list[dict[str, str]], dict[str, Any], dict[str, Any]]:
    messages = record["messages"]
    x_obj = extract_json_from_user(messages[1]["content"])
    y_obj = parse_assistant_json(messages[2]["content"])
    return messages[:2], x_obj or {}, y_obj or {}


def http_json(method: str, url: str, api_key: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Authorization": f"Bearer {api_key}"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} {url}: {body}") from exc


def multipart_upload_file(url: str, api_key: str, path: Path, purpose: str) -> dict[str, Any]:
    boundary = f"----Lalendar{uuid.uuid4().hex}"
    body = bytearray()

    def add_field(name: str, value: str) -> None:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(value.encode())
        body.extend(b"\r\n")

    add_field("purpose", purpose)
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(
        f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'.encode()
    )
    body.extend(b"Content-Type: application/jsonl\r\n\r\n")
    body.extend(path.read_bytes())
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} {url}: {body_text}") from exc


def run_finetune(args: argparse.Namespace) -> dict[str, Any]:
    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key:
        raise RuntimeError("TOGETHER_API_KEY environment variable is not set")
    base_url = args.together_base_url.rstrip("/")
    state = {
        "started_at": now_iso(),
        "base_model": args.base_model,
        "epochs": args.epochs,
        "learning_rate": args.learning_rate,
        "batch_size": args.batch_size,
        "train_file_path": str(TRAIN_CLEAN_PATH),
        "valid_file_path": str(VALID_CLEAN_PATH),
    }
    train_upload = multipart_upload_file(f"{base_url}/files", api_key, TRAIN_CLEAN_PATH, "fine-tune")
    valid_upload = multipart_upload_file(f"{base_url}/files", api_key, VALID_CLEAN_PATH, "fine-tune")
    train_file_id = train_upload.get("id")
    valid_file_id = valid_upload.get("id")
    state.update({"train_file_id": train_file_id, "valid_file_id": valid_file_id})
    payload = {
        "training_file": train_file_id,
        "validation_file": valid_file_id,
        "model": args.base_model,
        "n_epochs": args.epochs,
        "learning_rate": args.learning_rate,
        "batch_size": args.batch_size,
        "suffix": args.suffix,
    }
    job = http_json("POST", f"{base_url}/fine-tunes", api_key, payload)
    job_id = job.get("id")
    state["fine_tuning_job_id"] = job_id
    state["fine_tune_create_response"] = job
    RUN_STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.no_wait:
        return state

    deadline = time.time() + args.wait_timeout_minutes * 60
    last = job
    while time.time() < deadline:
        last = http_json("GET", f"{base_url}/fine-tunes/{job_id}", api_key)
        status = str(last.get("status", "")).lower()
        if status in {"succeeded", "completed", "failed", "cancelled", "canceled"}:
            break
        time.sleep(args.poll_seconds)
    state["fine_tune_final_response"] = last
    state["ended_at"] = now_iso()
    state["fine_tuned_model_id"] = (
        last.get("fine_tuned_model")
        or last.get("output_name")
        or last.get("model_output_name")
        or last.get("model")
    )
    RUN_STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    return state


def call_chat_completion(model: str, messages: list[dict[str, str]], args: argparse.Namespace) -> str:
    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key:
        raise RuntimeError("TOGETHER_API_KEY environment variable is not set")
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0,
        "max_tokens": 256,
    }
    data = http_json("POST", f"{args.together_base_url.rstrip('/')}/chat/completions", api_key, payload)
    return data["choices"][0]["message"]["content"]


def classify_failure(expected: dict[str, Any], parsed: dict[str, Any] | None, raw: str, error: str | None) -> str:
    if error:
        return "API 호출 실패"
    if parsed is None:
        return "JSON 파싱 실패"
    missing = [field for field in OUTPUT_FIELDS if field not in parsed]
    if missing:
        return "필드 누락"
    mismatches = [field for field in OUTPUT_FIELDS if str(parsed.get(field)) != str(expected.get(field))]
    if not mismatches:
        return "정상"
    if len(mismatches) == len(OUTPUT_FIELDS):
        return "전체 필드 불일치"
    return ", ".join(mismatches) + " 불일치"


def evaluate(args: argparse.Namespace, model_id: str | None = None) -> dict[str, Any]:
    if model_id is None:
        state = json.loads(RUN_STATE_PATH.read_text(encoding="utf-8")) if RUN_STATE_PATH.exists() else {}
        model_id = args.model_id or state.get("fine_tuned_model_id")
    if not model_id:
        raise RuntimeError("No fine-tuned model id available. Pass --model-id or complete fine-tuning first.")
    records = load_records(VALID_CLEAN_PATH if VALID_CLEAN_PATH.exists() else VALID_PATH)
    rows = []
    counts = {field: 0 for field in OUTPUT_FIELDS}
    parse_success = 0
    exact = 0
    response_lengths: list[int] = []
    for idx, record in enumerate(records, start=1):
        messages, x_obj, expected = prompt_from_record(record)
        raw = ""
        parsed = None
        error = None
        try:
            raw = call_chat_completion(model_id, messages, args)
            response_lengths.append(len(raw))
            parsed = parse_assistant_json(raw)
            if parsed is not None:
                parse_success += 1
        except Exception as exc:
            error = str(exc)
        matches = {}
        for field in OUTPUT_FIELDS:
            matches[field] = parsed is not None and str(parsed.get(field)) == str(expected.get(field))
            if matches[field]:
                counts[field] += 1
        all_match = all(matches.values())
        if all_match:
            exact += 1
        rows.append(
            {
                "no": idx,
                **{f"x_{k}": x_obj.get(k, "") for k in INPUT_FIELDS},
                **{f"expected_{k}": expected.get(k, "") for k in OUTPUT_FIELDS},
                **{f"predicted_{k}": "" if parsed is None else parsed.get(k, "") for k in OUTPUT_FIELDS},
                "raw_response": raw,
                "response_length": len(raw),
                "json_parse_success": parsed is not None,
                "exact_match": all_match,
                "failure_type": classify_failure(expected, parsed, raw, error),
                "error": error or "",
            }
        )
    write_predictions(rows)
    metrics = metrics_from_rows(rows, len(records))
    write_summary(metrics)
    return {"metrics": metrics, "rows": rows, "model_id": model_id}


def metrics_from_rows(rows: list[dict[str, Any]], total: int) -> dict[str, Any]:
    parse_success = sum(1 for row in rows if str(row.get("json_parse_success")) == "True" or row.get("json_parse_success") is True)
    exact = sum(1 for row in rows if str(row.get("exact_match")) == "True" or row.get("exact_match") is True)
    success = exact
    avg_len = sum(int(row.get("response_length") or 0) for row in rows) / len(rows) if rows else 0
    metrics: dict[str, Any] = {
        "total_samples": total,
        "successful_prediction_samples": success,
        "json_parse_success_rate": pct(parse_success, total),
        "exact_match_accuracy": pct(exact, total),
        "average_response_length": round(avg_len, 2),
        "failure_case_count": total - exact,
    }
    for field in OUTPUT_FIELDS:
        correct = sum(1 for row in rows if str(row.get(f"expected_{field}")) == str(row.get(f"predicted_{field}")))
        metrics[f"{field}_accuracy"] = pct(correct, total)
    failures: dict[str, int] = {}
    for row in rows:
        failure = str(row.get("failure_type") or "")
        if failure and failure != "정상":
            failures[failure] = failures.get(failure, 0) + 1
    metrics["failure_types"] = failures
    return metrics


def pct(num: int, den: int) -> str:
    return "N/A" if den == 0 else f"{(num / den) * 100:.2f}%"


def write_predictions(rows: list[dict[str, Any]]) -> None:
    fieldnames = [
        "no",
        *[f"x_{field}" for field in INPUT_FIELDS],
        *[f"expected_{field}" for field in OUTPUT_FIELDS],
        *[f"predicted_{field}" for field in OUTPUT_FIELDS],
        "raw_response",
        "response_length",
        "json_parse_success",
        "exact_match",
        "failure_type",
        "error",
    ]
    with PREDICTIONS_CSV_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_summary(metrics: dict[str, Any]) -> None:
    with SUMMARY_CSV_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["metric", "value"])
        labels = metric_labels()
        for key, label in labels.items():
            writer.writerow([label, metrics.get(key, "N/A")])
        failure_types = metrics.get("failure_types") or {}
        for key, value in failure_types.items():
            writer.writerow([f"주요 실패 유형: {key}", value])


def metric_labels() -> dict[str, str]:
    return {
        "total_samples": "전체 샘플 수",
        "successful_prediction_samples": "정상 예측 성공 샘플 수",
        "json_parse_success_rate": "JSON 파싱 성공률",
        "task_appliance_accuracy": "task_appliance 정확도",
        "task_appliance_mode_accuracy": "task_appliance_mode 정확도",
        "task_date_accuracy": "task_date 정확도",
        "task_start_time_accuracy": "task_start_time 정확도",
        "task_end_time_accuracy": "task_end_time 정확도",
        "exact_match_accuracy": "전체 필드 Exact Match Accuracy",
        "average_response_length": "평균 응답 길이",
        "failure_case_count": "실패 케이스 수",
    }


def placeholder_prediction_rows(valid_path: Path) -> list[dict[str, Any]]:
    rows = []
    for idx, record in enumerate(load_records(valid_path), start=1):
        _, x_obj, expected = prompt_from_record(record)
        rows.append(
            {
                "no": idx,
                **{f"x_{k}": x_obj.get(k, "") for k in INPUT_FIELDS},
                **{f"expected_{k}": expected.get(k, "") for k in OUTPUT_FIELDS},
                **{f"predicted_{k}": "" for k in OUTPUT_FIELDS},
                "raw_response": "",
                "response_length": 0,
                "json_parse_success": False,
                "exact_match": False,
                "failure_type": "파인튜닝/평가 미실행",
                "error": "No model prediction was produced.",
            }
        )
    write_predictions(rows)
    return rows


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def md_table(headers: list[str], rows: list[list[Any]], align_right: set[int] | None = None) -> str:
    align_right = align_right or set()
    lines = ["| " + " | ".join(headers) + " |"]
    separators = []
    for i, _ in enumerate(headers):
        separators.append("--:" if i in align_right else "-")
    lines.append("| " + " | ".join(separators) + " |")
    for row in rows:
        lines.append("| " + " | ".join(escape_md(str(cell)) for cell in row) + " |")
    return "\n".join(lines)


def escape_md(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", "<br>")


def summarize_validation(stats: dict[str, Any]) -> str:
    if stats["json_ok"] == stats["line_count"] and not stats["message_errors"]:
        status = "정상"
    else:
        status = "오류 있음"
    mojibake_note = (
        f"깨짐 의심 문자 {stats['suspicious_char_count']}개, 자동 복구 {stats['text_repairs']}개"
    )
    return (
        f"{status}: JSON {stats['json_ok']}/{stats['line_count']}줄 정상, "
        f"messages {stats['message_ok']}/{stats['line_count']}줄 정상, "
        f"감지 인코딩 {stats['detected_encoding']}, {mojibake_note}, UTF-8 clean 파일 생성"
    )


def generate_report(
    train_stats: dict[str, Any],
    valid_stats: dict[str, Any],
    args: argparse.Namespace,
    run_state: dict[str, Any] | None,
    run_error: str | None,
    metrics: dict[str, Any] | None,
) -> None:
    if metrics is None:
        rows = placeholder_prediction_rows(VALID_CLEAN_PATH if VALID_CLEAN_PATH.exists() else VALID_PATH)
        metrics = {
            "total_samples": valid_stats["line_count"],
            "successful_prediction_samples": "N/A",
            "json_parse_success_rate": "N/A",
            "task_appliance_accuracy": "N/A",
            "task_appliance_mode_accuracy": "N/A",
            "task_date_accuracy": "N/A",
            "task_start_time_accuracy": "N/A",
            "task_end_time_accuracy": "N/A",
            "exact_match_accuracy": "N/A",
            "average_response_length": "N/A",
            "failure_case_count": "N/A",
            "failure_types": {"파인튜닝/평가 미실행": valid_stats["line_count"]},
        }
        write_summary(metrics)
    else:
        rows = load_csv_rows(PREDICTIONS_CSV_PATH)

    run_state = run_state or {}
    started = run_state.get("started_at", "")
    ended = run_state.get("ended_at", "")
    duration = ""
    if started and ended:
        try:
            duration = str(dt.datetime.fromisoformat(ended) - dt.datetime.fromisoformat(started))
        except ValueError:
            duration = ""

    data_overview = md_table(
        ["항목", "값"],
        [
            ["학습 데이터 파일", "Qwen/train.jsonl -> Qwen/train_clean.jsonl"],
            ["검증 데이터 파일", "Qwen/valid.jsonl -> Qwen/valid_clean.jsonl"],
            ["학습 데이터 수", train_stats["line_count"]],
            ["검증 데이터 수", valid_stats["line_count"]],
            ["입력값 X", ", ".join(INPUT_FIELDS)],
            ["출력값 Y", ", ".join(OUTPUT_FIELDS)],
            ["데이터 형식", "messages 형식 JSONL"],
            ["인코딩 점검 결과", summarize_validation(train_stats) + " / " + summarize_validation(valid_stats)],
        ],
    )
    setting_table = md_table(
        ["항목", "값"],
        [
            ["Base Model", run_state.get("base_model", args.base_model)],
            ["Fine-tuned Model ID", run_state.get("fine_tuned_model_id", "N/A")],
            ["Epoch", run_state.get("epochs", args.epochs)],
            ["Learning Rate", run_state.get("learning_rate", args.learning_rate)],
            ["Batch Size", run_state.get("batch_size", args.batch_size)],
            ["Train File ID", run_state.get("train_file_id", "N/A")],
            ["Valid File ID", run_state.get("valid_file_id", "N/A")],
            ["Fine-tuning Job ID", run_state.get("fine_tuning_job_id", "N/A")],
            ["학습 시작 시간", started or "N/A"],
            ["학습 종료 시간", ended or "N/A"],
            ["총 학습 시간", duration or "N/A"],
        ],
    )
    perf_table = md_table(
        ["평가 항목", "결과값"],
        [[label, metrics.get(key, "N/A")] for key, label in metric_labels().items() if key != "average_response_length"],
        align_right={1},
    )
    sample_rows = []
    for row in rows[:10]:
        schedule = f"{row.get('x_event_title','')} ({row.get('x_event_date','')} {row.get('x_event_start_time','')}-{row.get('x_event_end_time','')})"
        weather = f"temp={row.get('x_day_temp','')}, humidity={row.get('x_day_humidity','')}, dust={row.get('x_day_dust','')}"
        expected = " / ".join(str(row.get(f"expected_{field}", "")) for field in OUTPUT_FIELDS)
        predicted = " / ".join(str(row.get(f"predicted_{field}", "")) for field in OUTPUT_FIELDS)
        sample_rows.append([row.get("no", ""), schedule, weather, expected, predicted or "N/A", row.get("exact_match", "N/A")])
    sample_table = md_table(["No", "입력 일정", "날씨 정보", "실제 가전 작업", "예측 가전 작업", "일치 여부"], sample_rows, align_right={0})

    failure_types = metrics.get("failure_types") or {}
    failure_rows = []
    for failure_type, count in failure_types.items():
        example = next((r for r in rows if r.get("failure_type") == failure_type), {})
        example_text = example.get("x_event_title", "") or "N/A"
        if failure_type == "파인튜닝/평가 미실행":
            improvement = "TOGETHER_API_KEY 설정 후 스크립트를 재실행해 실제 예측값을 생성"
        elif "JSON" in failure_type:
            improvement = "응답을 JSON only로 제한하고 후처리 파서를 강화"
        elif "불일치" in failure_type:
            improvement = "오답 유형별 추가 샘플 보강 및 epoch/learning rate 재조정"
        else:
            improvement = "실패 로그 확인 후 데이터/프롬프트/모델 설정 보정"
        failure_rows.append([failure_type, count, example_text, improvement])
    failure_table = md_table(["실패 유형", "발생 수", "예시", "개선 방향"], failure_rows, align_right={1})

    prepared_files = [
        TRAIN_CLEAN_PATH,
        VALID_CLEAN_PATH,
        SUMMARY_CSV_PATH,
        PREDICTIONS_CSV_PATH,
        RUN_STATE_PATH if RUN_STATE_PATH.exists() else None,
        REPORT_PATH,
    ]
    prepared_list = "\n".join(f"- `{p.relative_to(ROOT.parent)}`" for p in prepared_files if p)
    command = (
        "python Qwen/qwen_finetune_pipeline.py --prepare --finetune --evaluate "
        f"--base-model {args.base_model} --epochs {args.epochs} "
        f"--learning-rate {args.learning_rate} --batch-size {args.batch_size}"
    )

    error_section = ""
    if run_error:
        error_section = f"""
## 실행 실패 기록

- 실행 실패 사유: `{escape_md(run_error)}`
- 데이터 검증 결과: 학습 JSON {train_stats['json_ok']}/{train_stats['line_count']}줄, 검증 JSON {valid_stats['json_ok']}/{valid_stats['line_count']}줄
- 파인튜닝 실행 직전까지 준비된 파일 목록:
{prepared_list}

추후 실행 명령어:

```powershell
$env:TOGETHER_API_KEY="YOUR_TOGETHER_API_KEY"
{command}
```
"""

    report = f"""# Qwen 파인튜닝 결과 보고서

생성 시간: {now_iso()}

## 1. 데이터 개요

{data_overview}

## 2. 파인튜닝 설정

{setting_table}

## 3. 검증 성능 결과

{perf_table}

평균 응답 길이: {metrics.get('average_response_length', 'N/A')}

## 4. 예측 결과 샘플

{sample_table}

## 5. 실패 케이스 분석

{failure_table}
{error_section}
"""
    REPORT_PATH.write_text(report, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true", help="Validate and clean JSONL files.")
    parser.add_argument("--finetune", action="store_true", help="Upload files and start Together fine-tuning.")
    parser.add_argument("--evaluate", action="store_true", help="Evaluate validation data with a fine-tuned model.")
    parser.add_argument("--base-model", default=DEFAULT_BASE_MODEL)
    parser.add_argument("--model-id", default="")
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    parser.add_argument("--learning-rate", type=float, default=DEFAULT_LEARNING_RATE)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--suffix", default="lalendar-qwen")
    parser.add_argument("--together-base-url", default="https://api.together.xyz/v1")
    parser.add_argument("--poll-seconds", type=int, default=60)
    parser.add_argument("--wait-timeout-minutes", type=int, default=240)
    parser.add_argument("--no-wait", action="store_true")
    parser.add_argument("--report-only", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not (args.prepare or args.finetune or args.evaluate or args.report_only):
        args.prepare = True
        args.report_only = True

    run_state: dict[str, Any] | None = None
    run_error: str | None = None
    eval_result: dict[str, Any] | None = None
    try:
        if args.prepare or not (TRAIN_CLEAN_PATH.exists() and VALID_CLEAN_PATH.exists()):
            train_stats = validate_and_clean(TRAIN_PATH, TRAIN_CLEAN_PATH)
            valid_stats = validate_and_clean(VALID_PATH, VALID_CLEAN_PATH)
        else:
            train_stats = validate_and_clean(TRAIN_PATH, TRAIN_CLEAN_PATH)
            valid_stats = validate_and_clean(VALID_PATH, VALID_CLEAN_PATH)

        if args.finetune:
            run_state = run_finetune(args)
        elif RUN_STATE_PATH.exists():
            run_state = json.loads(RUN_STATE_PATH.read_text(encoding="utf-8"))

        if args.evaluate:
            eval_result = evaluate(args)

    except Exception as exc:
        run_error = f"{type(exc).__name__}: {exc}"
        (ROOT / "qwen_finetune_error.log").write_text(traceback.format_exc(), encoding="utf-8")
    finally:
        if "train_stats" not in locals():
            train_stats = validate_and_clean(TRAIN_PATH, TRAIN_CLEAN_PATH)
        if "valid_stats" not in locals():
            valid_stats = validate_and_clean(VALID_PATH, VALID_CLEAN_PATH)
        generate_report(
            train_stats,
            valid_stats,
            args,
            run_state,
            run_error,
            None if eval_result is None else eval_result["metrics"],
        )

    print(json.dumps({
        "report": str(REPORT_PATH),
        "summary_csv": str(SUMMARY_CSV_PATH),
        "predictions_csv": str(PREDICTIONS_CSV_PATH),
        "train_clean": str(TRAIN_CLEAN_PATH),
        "valid_clean": str(VALID_CLEAN_PATH),
        "error": run_error,
    }, ensure_ascii=False, indent=2))
    return 1 if run_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
