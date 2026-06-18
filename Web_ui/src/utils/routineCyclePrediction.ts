export type ApplianceUsageLog = {
  id?: string;
  appliance_id: string;
  appliance_type: string;
  action_type: "start" | "end" | "pause" | "error";
  started_at: string;
  ended_at?: string;
  mode?: string;
};

export type RoutineChangeType =
  | "none"
  | "interval_change"
  | "frequency_change"
  | "interval_and_frequency_change";

export type RoutineCyclePrediction = {
  appliance_id: string;
  appliance_type: string;
  base_cycle_days: number | null;
  recent_cycle_days: number | null;
  adapted_cycle_days: number | null;
  cycle_changed: boolean;
  base_daily_frequency: number | null;
  recent_daily_frequency: number | null;
  adapted_daily_frequency: number | null;
  frequency_changed: boolean;
  change_type: RoutineChangeType;
  change_confidence: number;
  next_expected_date: string | null;
  reason: string;
  // Backward-compatible aliases from the first implementation.
  base_daily_usage_count: number | null;
  recent_daily_usage_count: number | null;
};

export type RoutineCyclePredictionOptions = {
  minRecentCount?: number;
  diffThresholdDays?: number;
  maxRecentStd?: number;
  dailyFrequencyThreshold?: number;
  alpha?: number;
};

export type TimeBasedUsageLogSplit = {
  train: ApplianceUsageLog[];
  validation: ApplianceUsageLog[];
  changedRoutineTest: ApplianceUsageLog[];
};

export type RoutinePredictionEvaluationSample = {
  prediction: RoutineCyclePrediction;
  actual_cycle_days?: number | null;
  actual_next_expected_date?: string | null;
  actual_changed?: boolean;
};

export type RoutinePredictionEvaluationMetrics = {
  cycle_mae: number | null;
  next_expected_date_error_days: number | null;
  change_detection_precision: number | null;
  change_detection_recall: number | null;
  change_detection_f1: number | null;
};

type CycleChangeDetection = {
  cycle_changed: boolean;
  recent_cycle_days: number | null;
  change_confidence: number;
  diff_days: number | null;
  recent_std: number | null;
};

type FrequencyChangeDetection = {
  frequency_changed: boolean;
  base_daily_frequency: number | null;
  recent_daily_frequency: number | null;
  adapted_daily_frequency: number | null;
  frequency_diff: number | null;
  frequency_confidence: number;
};

type DailyUsageCount = {
  date: string;
  count: number;
};

type NormalizedUsageLog = ApplianceUsageLog & {
  started_date: string;
};

const DEFAULT_OPTIONS: Required<RoutineCyclePredictionOptions> = {
  minRecentCount: 3,
  diffThresholdDays: 1.5,
  maxRecentStd: 1.2,
  dailyFrequencyThreshold: 0.5,
  alpha: 0.6,
};

const TIME_SPLIT_BOUNDARIES = {
  trainEnd: "2025-10-31",
  validationStart: "2025-11-01",
  validationEnd: "2025-12-31",
  changedRoutineTestStart: "2026-01-01",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Calculates the median value from numeric values. */
export function median(values: number[]): number | null {
  const sortedValues = values
    .filter((value) => Number.isFinite(value))
    .slice()
    .sort((a, b) => a - b);

  if (sortedValues.length === 0) return null;

  const middle = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
}

/** Calculates population standard deviation for recent interval stability. */
export function std(values: number[]): number | null {
  const numericValues = values.filter((value) => Number.isFinite(value));
  if (numericValues.length === 0) return null;

  const averageValue = average(numericValues);
  if (averageValue == null) return null;

  const variance =
    numericValues.reduce((sum, value) => sum + (value - averageValue) ** 2, 0) /
    numericValues.length;

  return Math.sqrt(variance);
}

/** Calculates day intervals from sorted yyyy-mm-dd usage dates. */
export function calculateIntervals(usageDates: string[]): number[] {
  const uniqueSortedDates = Array.from(
    new Set(usageDates.map(toDateKey).filter(isDateKey)),
  ).sort();

  return uniqueSortedDates
    .slice(1)
    .map((dateKey, index) => daysBetween(uniqueSortedDates[index], dateKey))
    .filter((interval) => interval > 0);
}

/** Uses the median interval as the base cycle prediction. */
export function predictBaseCycle(intervals: number[]): number | null {
  return roundDays(median(intervals));
}

/** Detects TTA-inspired interval cycle changes from recent unlabeled logs. */
export function detectCycleChange(
  baseCycle: number | null,
  recentIntervals: number[],
  options: RoutineCyclePredictionOptions = {},
): CycleChangeDetection {
  const resolvedOptions = resolveOptions(options);
  const recent_cycle_days = roundDays(median(recentIntervals));
  const recent_std = roundDays(std(recentIntervals));

  if (
    baseCycle == null ||
    recent_cycle_days == null ||
    recentIntervals.length < resolvedOptions.minRecentCount
  ) {
    return {
      cycle_changed: false,
      recent_cycle_days,
      change_confidence: 0,
      diff_days: null,
      recent_std,
    };
  }

  const diff_days = roundNumber(Math.abs(recent_cycle_days - baseCycle));
  const cycle_changed =
    diff_days >= resolvedOptions.diffThresholdDays &&
    recent_std != null &&
    recent_std <= resolvedOptions.maxRecentStd;

  return {
    cycle_changed,
    recent_cycle_days,
    change_confidence: cycle_changed
      ? calculateIntervalConfidence(diff_days, recent_std, resolvedOptions)
      : 0,
    diff_days,
    recent_std,
  };
}

/** Detects same-day frequency changes, such as 1 use/day to 2 uses/day. */
export function detectDailyUsageFrequencyChange(
  dailyUsageCounts: DailyUsageCount[],
  options: RoutineCyclePredictionOptions = {},
): FrequencyChangeDetection {
  const resolvedOptions = resolveOptions(options);
  const sortedCounts = dailyUsageCounts
    .filter((item) => isDateKey(item.date) && Number.isFinite(item.count))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const recentCounts = sortedCounts.slice(-resolvedOptions.minRecentCount);
  const baseCounts = sortedCounts.slice(0, -resolvedOptions.minRecentCount);
  const base_daily_frequency = roundDays(
    average(
      baseCounts.length > 0
        ? baseCounts.map((item) => item.count)
        : sortedCounts.map((item) => item.count),
    ),
  );
  const recent_daily_frequency = roundDays(
    average(recentCounts.map((item) => item.count)),
  );

  if (
    base_daily_frequency == null ||
    recent_daily_frequency == null ||
    recentCounts.length < resolvedOptions.minRecentCount
  ) {
    return {
      frequency_changed: false,
      base_daily_frequency,
      recent_daily_frequency,
      adapted_daily_frequency: base_daily_frequency,
      frequency_diff: null,
      frequency_confidence: 0,
    };
  }

  const frequency_diff = roundNumber(
    Math.abs(recent_daily_frequency - base_daily_frequency),
  );
  const frequency_changed =
    frequency_diff >= resolvedOptions.dailyFrequencyThreshold;
  const adapted_daily_frequency = frequency_changed
    ? adaptFrequency(
        base_daily_frequency,
        recent_daily_frequency,
        resolvedOptions.alpha,
      )
    : base_daily_frequency;

  return {
    frequency_changed,
    base_daily_frequency,
    recent_daily_frequency,
    adapted_daily_frequency,
    frequency_diff,
    frequency_confidence: frequency_changed
      ? calculateFrequencyConfidence(frequency_diff, resolvedOptions)
      : 0,
  };
}

/** Blends base and recent cycles without retraining the underlying model. */
export function adaptCycle(
  baseCycle: number | null,
  recentCycle: number | null,
  alpha: number = DEFAULT_OPTIONS.alpha,
): number | null {
  if (baseCycle == null) return null;
  if (recentCycle == null) return roundDays(baseCycle);

  const clampedAlpha = clamp(alpha, 0, 1);
  return roundDays(clampedAlpha * recentCycle + (1 - clampedAlpha) * baseCycle);
}

/** Blends base and recent daily frequency for TTA-inspired adaptation. */
export function adaptFrequency(
  baseFrequency: number | null,
  recentFrequency: number | null,
  alpha: number = DEFAULT_OPTIONS.alpha,
): number | null {
  if (baseFrequency == null) return null;
  if (recentFrequency == null) return roundDays(baseFrequency);

  const clampedAlpha = clamp(alpha, 0, 1);
  return roundDays(
    clampedAlpha * recentFrequency + (1 - clampedAlpha) * baseFrequency,
  );
}

/** Predicts one appliance's routine and applies TTA-inspired recalibration. */
export function predictRoutineCycle(
  logs: ApplianceUsageLog[],
  options: RoutineCyclePredictionOptions = {},
): RoutineCyclePrediction {
  const resolvedOptions = resolveOptions(options);
  const startLogs = normalizeStartLogs(logs);
  const fallbackIdentity = getFallbackIdentity(logs);

  if (startLogs.length === 0) {
    return createEmptyPrediction(
      fallbackIdentity.appliance_id,
      fallbackIdentity.appliance_type,
      "사용 시작 로그가 부족해 아직 주기 변화를 판단하지 않았습니다.",
    );
  }

  const appliance_id = startLogs[0].appliance_id;
  const appliance_type = startLogs[0].appliance_type;
  const usageDates = uniqueSortedUsageDates(startLogs);
  const intervals = calculateIntervals(usageDates);
  const base_cycle_days = predictBaseCycle(intervals);
  const recentIntervals = intervals.slice(-resolvedOptions.minRecentCount);
  const cycleDetection = detectCycleChange(
    base_cycle_days,
    recentIntervals,
    resolvedOptions,
  );
  const frequencyDetection = detectDailyUsageFrequencyChange(
    calculateDailyUsageCounts(startLogs),
    resolvedOptions,
  );
  const adapted_cycle_days = cycleDetection.cycle_changed
    ? adaptCycle(
        base_cycle_days,
        cycleDetection.recent_cycle_days,
        resolvedOptions.alpha,
      )
    : base_cycle_days;
  const next_expected_date =
    adapted_cycle_days == null || usageDates.length === 0
      ? null
      : addDays(usageDates[usageDates.length - 1], adapted_cycle_days);
  const change_type = getChangeType(
    cycleDetection.cycle_changed,
    frequencyDetection.frequency_changed,
  );

  return {
    appliance_id,
    appliance_type,
    base_cycle_days,
    recent_cycle_days: cycleDetection.recent_cycle_days,
    adapted_cycle_days,
    cycle_changed: cycleDetection.cycle_changed,
    base_daily_frequency: frequencyDetection.base_daily_frequency,
    recent_daily_frequency: frequencyDetection.recent_daily_frequency,
    adapted_daily_frequency: frequencyDetection.adapted_daily_frequency,
    frequency_changed: frequencyDetection.frequency_changed,
    change_type,
    change_confidence: Math.max(
      cycleDetection.change_confidence,
      frequencyDetection.frequency_confidence,
    ),
    next_expected_date,
    reason: buildReason(
      change_type,
      base_cycle_days,
      cycleDetection.recent_cycle_days,
      frequencyDetection,
    ),
    base_daily_usage_count: frequencyDetection.base_daily_frequency,
    recent_daily_usage_count: frequencyDetection.recent_daily_frequency,
  };
}

/** Groups logs by appliance and exports predictions for Daily Report or calendar recommendations. */
export function predictAllApplianceCycles(
  logs: ApplianceUsageLog[],
  options: RoutineCyclePredictionOptions = {},
): RoutineCyclePrediction[] {
  const groupedLogs = new Map<string, ApplianceUsageLog[]>();

  logs.forEach((log) => {
    const applianceId = getLogValue(log, "appliance_id", "deviceId") ?? "unknown";
    const applianceType =
      getLogValue(log, "appliance_type", "applianceType", "deviceType") ??
      "unknown";
    const key = `${applianceId}:${applianceType}`;
    groupedLogs.set(key, [...(groupedLogs.get(key) ?? []), log]);
  });

  return Array.from(groupedLogs.values())
    .map((applianceLogs) => predictRoutineCycle(applianceLogs, options))
    .sort((a, b) => b.change_confidence - a.change_confidence);
}

/** Splits ThinQ-like logs by fixed dates, not by random sampling. */
export function splitUsageLogsByTime(logs: ApplianceUsageLog[]): TimeBasedUsageLogSplit {
  return logs.reduce<TimeBasedUsageLogSplit>(
    (split, log) => {
      const dateKey = toDateKey(getLogValue(log, "started_at", "startedAt") ?? "");
      if (!isDateKey(dateKey)) return split;

      if (dateKey <= TIME_SPLIT_BOUNDARIES.trainEnd) {
        split.train.push(log);
      } else if (
        dateKey >= TIME_SPLIT_BOUNDARIES.validationStart &&
        dateKey <= TIME_SPLIT_BOUNDARIES.validationEnd
      ) {
        split.validation.push(log);
      } else if (dateKey >= TIME_SPLIT_BOUNDARIES.changedRoutineTestStart) {
        split.changedRoutineTest.push(log);
      }

      return split;
    },
    { train: [], validation: [], changedRoutineTest: [] },
  );
}

/** Calculates routine prediction metrics for validation/test reporting. */
export function evaluateRoutineCyclePredictions(
  samples: RoutinePredictionEvaluationSample[],
): RoutinePredictionEvaluationMetrics {
  const cycleErrors = samples
    .map((sample) =>
      sample.actual_cycle_days != null && sample.prediction.adapted_cycle_days != null
        ? Math.abs(sample.prediction.adapted_cycle_days - sample.actual_cycle_days)
        : null,
    )
    .filter(isNumber);
  const dateErrors = samples
    .map((sample) =>
      sample.actual_next_expected_date && sample.prediction.next_expected_date
        ? Math.abs(
            daysBetween(
              sample.prediction.next_expected_date,
              sample.actual_next_expected_date,
            ),
          )
        : null,
    )
    .filter(isNumber);
  const detectionSamples = samples.filter(
    (sample) => typeof sample.actual_changed === "boolean",
  );
  const truePositive = detectionSamples.filter(
    (sample) => sample.prediction.change_type !== "none" && sample.actual_changed,
  ).length;
  const falsePositive = detectionSamples.filter(
    (sample) => sample.prediction.change_type !== "none" && !sample.actual_changed,
  ).length;
  const falseNegative = detectionSamples.filter(
    (sample) => sample.prediction.change_type === "none" && sample.actual_changed,
  ).length;
  const precision =
    truePositive + falsePositive === 0
      ? null
      : truePositive / (truePositive + falsePositive);
  const recall =
    truePositive + falseNegative === 0
      ? null
      : truePositive / (truePositive + falseNegative);
  const f1 =
    precision == null || recall == null || precision + recall === 0
      ? null
      : (2 * precision * recall) / (precision + recall);

  return {
    cycle_mae: roundDays(average(cycleErrors)),
    next_expected_date_error_days: roundDays(average(dateErrors)),
    change_detection_precision: roundDays(precision),
    change_detection_recall: roundDays(recall),
    change_detection_f1: roundDays(f1),
  };
}

function normalizeStartLogs(logs: ApplianceUsageLog[]): NormalizedUsageLog[] {
  return logs
    .map(normalizeLog)
    .filter((log): log is NormalizedUsageLog => Boolean(log))
    .filter((log) => log.action_type === "start")
    .sort((a, b) => {
      const dateCompare = a.started_date.localeCompare(b.started_date);
      return dateCompare || a.started_at.localeCompare(b.started_at);
    });
}

function normalizeLog(log: ApplianceUsageLog): NormalizedUsageLog | null {
  const startedAt =
    getLogValue(log, "started_at", "startedAt", "usage_date", "usageDate", "capturedAt") ??
    "";
  const startedDate = toDateKey(startedAt);
  if (!isDateKey(startedDate)) return null;

  return {
    ...log,
    appliance_id: getLogValue(log, "appliance_id", "deviceId") ?? "unknown",
    appliance_type:
      getLogValue(log, "appliance_type", "applianceType", "deviceType") ?? "unknown",
    action_type:
      (getLogValue(log, "action_type", "actionType") as ApplianceUsageLog["action_type"]) ??
      "start",
    started_at: startedAt,
    started_date: startedDate,
  };
}

function calculateDailyUsageCounts(logs: NormalizedUsageLog[]): DailyUsageCount[] {
  const countsByDate = new Map<string, number>();

  logs.forEach((log) => {
    countsByDate.set(log.started_date, (countsByDate.get(log.started_date) ?? 0) + 1);
  });

  return Array.from(countsByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function uniqueSortedUsageDates(logs: NormalizedUsageLog[]): string[] {
  return Array.from(new Set(logs.map((log) => log.started_date))).sort();
}

function resolveOptions(
  options: RoutineCyclePredictionOptions = {},
): Required<RoutineCyclePredictionOptions> {
  return {
    minRecentCount: Math.max(
      1,
      Math.floor(options.minRecentCount ?? DEFAULT_OPTIONS.minRecentCount),
    ),
    diffThresholdDays: Math.max(
      0,
      options.diffThresholdDays ?? DEFAULT_OPTIONS.diffThresholdDays,
    ),
    maxRecentStd: Math.max(0, options.maxRecentStd ?? DEFAULT_OPTIONS.maxRecentStd),
    dailyFrequencyThreshold: Math.max(
      0,
      options.dailyFrequencyThreshold ?? DEFAULT_OPTIONS.dailyFrequencyThreshold,
    ),
    alpha: clamp(options.alpha ?? DEFAULT_OPTIONS.alpha, 0, 1),
  };
}

function getChangeType(
  cycleChanged: boolean,
  frequencyChanged: boolean,
): RoutineChangeType {
  if (cycleChanged && frequencyChanged) return "interval_and_frequency_change";
  if (cycleChanged) return "interval_change";
  if (frequencyChanged) return "frequency_change";
  return "none";
}

function buildReason(
  changeType: RoutineChangeType,
  baseCycle: number | null,
  recentCycle: number | null,
  frequencyDetection: FrequencyChangeDetection,
): string {
  switch (changeType) {
    case "interval_change":
      return `최근 사용 주기가 바뀐 것 같아요. 기존에는 약 ${formatDays(baseCycle)}마다 사용했지만, 최근에는 약 ${formatDays(recentCycle)} 간격으로 사용되고 있어요.`;
    case "frequency_change":
      return `최근 하루 사용 횟수가 늘어난 것 같아요. 기존에는 하루 ${formatCount(frequencyDetection.base_daily_frequency)}회 사용했지만, 최근에는 하루 ${formatCount(frequencyDetection.recent_daily_frequency)}회 사용하는 패턴이 보여요.`;
    case "interval_and_frequency_change":
      return "최근 사용 간격과 하루 사용 횟수가 모두 바뀐 것 같아요.";
    case "none":
    default:
      return "최근 사용 패턴은 기존 루틴과 크게 다르지 않아요.";
  }
}

function createEmptyPrediction(
  applianceId: string,
  applianceType: string,
  reason: string,
): RoutineCyclePrediction {
  return {
    appliance_id: applianceId,
    appliance_type: applianceType,
    base_cycle_days: null,
    recent_cycle_days: null,
    adapted_cycle_days: null,
    cycle_changed: false,
    base_daily_frequency: null,
    recent_daily_frequency: null,
    adapted_daily_frequency: null,
    frequency_changed: false,
    change_type: "none",
    change_confidence: 0,
    next_expected_date: null,
    reason,
    base_daily_usage_count: null,
    recent_daily_usage_count: null,
  };
}

function calculateIntervalConfidence(
  diffDays: number,
  recentStd: number | null,
  options: Required<RoutineCyclePredictionOptions>,
): number {
  if (recentStd == null) return 0;

  const diffScore = clamp(diffDays / Math.max(options.diffThresholdDays * 2, 1), 0, 1);
  const stabilityScore = clamp(1 - recentStd / Math.max(options.maxRecentStd, 0.1), 0, 1);

  return roundNumber(0.55 * diffScore + 0.45 * stabilityScore);
}

function calculateFrequencyConfidence(
  frequencyDiff: number,
  options: Required<RoutineCyclePredictionOptions>,
): number {
  return roundNumber(
    clamp(
      frequencyDiff / Math.max(options.dailyFrequencyThreshold * 2, 1),
      0,
      1,
    ),
  );
}

function getFallbackIdentity(logs: ApplianceUsageLog[]): {
  appliance_id: string;
  appliance_type: string;
} {
  const firstLog = logs[0];
  return {
    appliance_id: firstLog
      ? getLogValue(firstLog, "appliance_id", "deviceId") ?? "unknown"
      : "unknown",
    appliance_type: firstLog
      ? getLogValue(firstLog, "appliance_type", "applianceType", "deviceType") ??
        "unknown"
      : "unknown",
  };
}

function getLogValue(log: ApplianceUsageLog, ...keys: string[]): string | undefined {
  const looseLog = log as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = looseLog[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return undefined;
}

function daysBetween(startDateKey: string, endDateKey: string): number {
  const startTime = new Date(`${startDateKey}T00:00:00`).getTime();
  const endTime = new Date(`${endDateKey}T00:00:00`).getTime();
  return Math.round((endTime - startTime) / MS_PER_DAY);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + Math.round(days));
  return toLocalDateKey(date);
}

function toDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalDateKey(date);
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isNumber(value: number | null): value is number {
  return value != null && Number.isFinite(value);
}

function average(values: number[]): number | null {
  const numericValues = values.filter((value) => Number.isFinite(value));
  if (numericValues.length === 0) return null;

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function roundDays(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return roundNumber(value);
}

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatDays(days: number | null): string {
  if (days == null) return "알 수 없는 기간";
  return Number.isInteger(days) ? `${days}일` : `${roundDays(days)}일`;
}

function formatCount(count: number | null): string {
  if (count == null) return "알 수 없는 횟수";
  return Number.isInteger(count) ? `${count}` : `${roundDays(count)}`;
}
