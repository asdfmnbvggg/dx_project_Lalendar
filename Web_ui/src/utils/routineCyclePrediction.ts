export type ApplianceUsageLog = {
  id?: string;
  appliance_id: string;
  appliance_type: string;
  action_type: "start" | "end" | "pause" | "error";
  started_at: string;
  ended_at?: string;
  mode?: string;
};

export type RoutineCyclePrediction = {
  appliance_id: string;
  appliance_type: string;
  base_cycle_days: number | null;
  recent_cycle_days: number | null;
  adapted_cycle_days: number | null;
  cycle_changed: boolean;
  change_confidence: number;
  next_expected_date: string | null;
  reason: string;
};

export type RoutineCyclePredictionOptions = {
  minRecentCount?: number;
  diffThresholdDays?: number;
  maxRecentStd?: number;
  alpha?: number;
};

type CycleChangeDetection = {
  cycle_changed: boolean;
  recent_cycle_days: number | null;
  change_confidence: number;
  diff_days: number | null;
  recent_std: number | null;
};

type NormalizedUsageLog = ApplianceUsageLog & {
  started_date: string;
};

const DEFAULT_OPTIONS: Required<RoutineCyclePredictionOptions> = {
  minRecentCount: 3,
  diffThresholdDays: 1.5,
  maxRecentStd: 1.2,
  alpha: 0.6,
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

  const average =
    numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
  const variance =
    numericValues.reduce((sum, value) => sum + (value - average) ** 2, 0) /
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

/** Detects TTA-inspired cycle changes from recent unlabeled service-time logs. */
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

  const diff_days = roundFiniteDays(Math.abs(recent_cycle_days - baseCycle));
  const isMeaningfullyDifferent = diff_days >= resolvedOptions.diffThresholdDays;
  const isRecentPatternStable =
    recent_std != null && recent_std <= resolvedOptions.maxRecentStd;
  const cycle_changed = isMeaningfullyDifferent && isRecentPatternStable;
  const change_confidence =
    cycle_changed && recent_std != null
      ? calculateChangeConfidence(
          diff_days,
          recent_std,
          resolvedOptions,
          cycle_changed,
        )
      : 0;

  return {
    cycle_changed,
    recent_cycle_days,
    change_confidence,
    diff_days,
    recent_std,
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

/** Predicts one appliance's cycle and applies TTA-inspired adaptive cycle recalibration. */
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
      "사용 시작 로그가 부족해 아직 주기를 예측할 수 없습니다.",
    );
  }

  const appliance_id = startLogs[0].appliance_id;
  const appliance_type = startLogs[0].appliance_type;
  const usageDates = uniqueSortedUsageDates(startLogs);
  const intervals = calculateIntervals(usageDates);
  const base_cycle_days = predictBaseCycle(intervals);
  const recentIntervals = intervals.slice(-resolvedOptions.minRecentCount);
  const detection = detectCycleChange(base_cycle_days, recentIntervals, resolvedOptions);
  const adapted_cycle_days = detection.cycle_changed
    ? adaptCycle(base_cycle_days, detection.recent_cycle_days, resolvedOptions.alpha)
    : base_cycle_days;
  const next_expected_date =
    adapted_cycle_days == null || usageDates.length === 0
      ? null
      : addDays(usageDates[usageDates.length - 1], adapted_cycle_days);

  return {
    appliance_id,
    appliance_type,
    base_cycle_days,
    recent_cycle_days: detection.recent_cycle_days,
    adapted_cycle_days,
    cycle_changed: detection.cycle_changed,
    change_confidence: detection.change_confidence,
    next_expected_date,
    reason: buildReason(base_cycle_days, detection.recent_cycle_days, detection.cycle_changed),
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
      getLogValue(log, "appliance_type", "applianceType", "deviceType") ?? "unknown";
    const key = `${applianceId}:${applianceType}`;
    groupedLogs.set(key, [...(groupedLogs.get(key) ?? []), log]);
  });

  return Array.from(groupedLogs.values())
    .map((applianceLogs) => predictRoutineCycle(applianceLogs, options))
    .sort((a, b) => b.change_confidence - a.change_confidence);
}

function normalizeStartLogs(logs: ApplianceUsageLog[]): NormalizedUsageLog[] {
  return logs
    .map(normalizeLog)
    .filter((log): log is NormalizedUsageLog => Boolean(log))
    .filter((log) => log.action_type === "start")
    .sort((a, b) => a.started_date.localeCompare(b.started_date));
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
    alpha: clamp(options.alpha ?? DEFAULT_OPTIONS.alpha, 0, 1),
  };
}

function buildReason(
  baseCycle: number | null,
  recentCycle: number | null,
  cycleChanged: boolean,
): string {
  if (baseCycle == null || recentCycle == null) {
    return "사용 간격 데이터가 부족해 아직 주기 변화를 판단하지 않았습니다.";
  }

  if (cycleChanged) {
    return `최근 사용 주기가 바뀐 것 같아요. 기존에는 약 ${formatDays(baseCycle)}마다 사용했지만, 최근에는 약 ${formatDays(recentCycle)} 간격으로 사용되고 있어요. 최근 패턴을 반영해 다음 예상 사용일을 다시 계산했습니다.`;
  }

  return "최근 사용 간격이 기존 주기와 크게 다르지 않아 기존 예측 주기를 유지했습니다.";
}

function calculateChangeConfidence(
  diffDays: number,
  recentStd: number | null,
  options: Required<RoutineCyclePredictionOptions>,
  cycleChanged: boolean,
): number {
  if (!cycleChanged || recentStd == null) return 0;

  const diffScore = clamp(diffDays / Math.max(options.diffThresholdDays * 2, 1), 0, 1);
  const stabilityScore = clamp(1 - recentStd / Math.max(options.maxRecentStd, 0.1), 0, 1);

  return Math.round((0.55 * diffScore + 0.45 * stabilityScore) * 100) / 100;
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
    change_confidence: 0,
    next_expected_date: null,
    reason,
  };
}

function getFallbackIdentity(logs: ApplianceUsageLog[]): {
  appliance_id: string;
  appliance_type: string;
} {
  const firstLog = logs[0];
  return {
    appliance_id: firstLog ? getLogValue(firstLog, "appliance_id", "deviceId") ?? "unknown" : "unknown",
    appliance_type:
      firstLog
        ? getLogValue(firstLog, "appliance_type", "applianceType", "deviceType") ?? "unknown"
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

function roundDays(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function roundFiniteDays(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatDays(days: number): string {
  return Number.isInteger(days) ? `${days}일` : `${roundDays(days)}일`;
}
