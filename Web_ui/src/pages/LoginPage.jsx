import { useState } from "react";
import { findLoginUser } from "../constants/users.js";

export default function LoginPage({ onLogin }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const user = findLoginUser(id.trim(), password);

    if (!user) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    setError("");
    onLogin(user);
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span><img src="/icons/icon-192.png" alt="" aria-hidden="true" /></span>
          <div>
            <strong>L-lander</strong>
            <small>우리 가족 일정과 가사를 함께 정리해요</small>
          </div>
        </div>

        <div className="login-intro">
          <b>오늘의 캘린더를 열어볼까요?</b>
          <p>로그인하면 내 일정과 담당 가사 일정을 바로 확인할 수 있어요.</p>
        </div>

        <label>
          아이디
          <input value={id} onChange={(event) => setId(event.target.value)} autoComplete="username" placeholder="아이디를 입력해 주세요" autoFocus />
        </label>

        <label>
          비밀번호
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button type="submit">로그인</button>
      </form>
    </main>
  );
}
