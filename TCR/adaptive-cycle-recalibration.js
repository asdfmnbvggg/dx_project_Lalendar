const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_TTA_INSPIRED_CONFIG = Object.freeze({
  recentWindowSize: 5,
  minRecentIntervals: 2,
  shiftRatioThreshold: 0.25,
  adaptationWeight: 0.35,
  minCycleDays: 1,
  maxCycleDays: 365,
});

export function ttaInspiredAdaptiveCycleRecalibration(input) {
  const {
    usageLogs,
    baseCycleDays,
    referenceDate,
    config = {},
  } = input ?? {};
  const mergedConfig = normalizeConfig(config);
  const sortedUsageDates = normalizeUsageDates(usageLogs);

  if (sortedUsageDates.length < 2) {
    throw new Error("At least two usage logs are required for cycle recalibration.");
  }

  const base_cycle_days =
    isPositiveNumber(baseCycleDays)
      ? clamp(baseCycleDays, mergedConfig.minCycleDays, mergedConfig.maxCycleDays)
      : estimateBaseCycleDays(sortedUsageDates, mergedConfig);

  const recent_intervals = calculateRecentIntervals(
    sortedUsageDates,
    mergedConfig.recentWindowSize
  );
  const recent_cycle_days =
    recent_intervals.length >= mergedConfig.minRecentIntervals
      ? median(recent_intervals)
      : null;

  const cycle_shift_ratio =
    recent_cycle_days == null
      ? 0
      : Math.abs(recent_cycle_days - base_cycle_days) / base_cycle_days;
  const cycle_shift_detected =
    recent_cycle_days != null &&
    cycle_shift_ratio >= mergedConfig.shiftRatioThreshold;

  // TTA-inspired adaptive cycle recalibration: adapt only the cycle parameter
  // from unlabeled service-time logs. This does not retrain the underlying model.
  const adapted_cycle_days = cycle_shift_detected
    ? clamp(
        blendCycleDays(
          base_cycle_days,
          recent_cycle_days,
          mergedConfig.adaptationWeight
        ),
        mergedConfig.minCycleDays,
        mergedConfig.maxCycleDays
      )
    : base_cycle_days;

  const last_usage_date = sortedUsageDates[sortedUsageDates.length - 1];
  const next_expected_usage_date = addDays(
    last_usage_date,
    adapted_cycle_days,
    referenceDate
  );

  return {
    base_cycle_days: roundDays(base_cycle_days),
    recent_intervals: recent_intervals.map(roundDays),
    recent_cycle_days:
      recent_cycle_days == null ? null : roundDays(recent_cycle_days),
    cycle_shift_detected,
    cycle_shift_ratio: roundRatio(cycle_shift_ratio),
    adapted_cycle_days: roundDays(adapted_cycle_days),
    last_usage_date: toDateOnlyString(last_usage_date),
    next_expected_usage_date: toDateOnlyString(next_expected_usage_date),
    method: "TTA-inspired Adaptive Cycle Recalibration",
  };
}

export function estimateBaseCycleDays(usageLogs, config = {}) {
  const mergedConfig = normalizeConfig(config);
  const sortedUsageDates = normalizeUsageDates(usageLogs);
  const intervals = calculateIntervals(sortedUsageDates);

  if (intervals.length === 0) {
    throw new Error("At least two usage logs are required to estimate base_cycle_days.");
  }

  return clamp(
    median(intervals),
    mergedConfig.minCycleDays,
    mergedConfig.maxCycleDays
  );
}

export function calculateIntervals(usageDates) {
  const sortedUsageDates = normalizeUsageDates(usageDates);

  return sortedUsageDates
    .slice(1)
    .map((date, index) => daysBetween(sortedUsageDates[index], date))
    .filter(isPositiveNumber);
}

export function calculateRecentIntervals(usageDates, recentWindowSize = 5) {
  const sortedUsageDates = normalizeUsageDates(usageDates);
  const windowSize = Math.max(2, Math.floor(recentWindowSize));
  const recentDates = sortedUsageDates.slice(-windowSize);

  return calculateIntervals(recentDates);
}

export function median(values) {
  const sortedValues = values
    .filter(isPositiveNumber)
    .slice()
    .sort((a, b) => a - b);

  if (sortedValues.length === 0) {
    throw new Error("Cannot calculate median from an empty numeric array.");
  }

  const middle = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
}

function normalizeConfig(config) {
  const mergedConfig = {
    ...DEFAULT_TTA_INSPIRED_CONFIG,
    ...config,
  };

  return {
    recentWindowSize: Math.max(2, Math.floor(mergedConfig.recentWindowSize)),
    minRecentIntervals: Math.max(1, Math.floor(mergedConfig.minRecentIntervals)),
    shiftRatioThreshold: clamp(mergedConfig.shiftRatioThreshold, 0, 1),
    adaptationWeight: clamp(mergedConfig.adaptationWeight, 0, 1),
    minCycleDays: Math.max(0.1, Number(mergedConfig.minCycleDays)),
    maxCycleDays: Math.max(
      Number(mergedConfig.minCycleDays),
      Number(mergedConfig.maxCycleDays)
    ),
  };
}

function normalizeUsageDates(usageLogs) {
  if (!Array.isArray(usageLogs)) {
    throw new Error("usageLogs must be an array of dates or log objects.");
  }

  return usageLogs
    .map(extractUsageDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());
}

function extractUsageDate(log) {
  if (log instanceof Date) {
    return isNaN(log.getTime()) ? null : log;
  }

  if (typeof log === "string" || typeof log === "number") {
    const date = new Date(log);
    return isNaN(date.getTime()) ? null : date;
  }

  if (log && typeof log === "object") {
    const rawDate =
      log.used_at ??
      log.usedAt ??
      log.usage_date ??
      log.usageDate ??
      log.date ??
      log.timestamp ??
      log.created_at ??
      log.createdAt;
    const date = new Date(rawDate);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function daysBetween(startDate, endDate) {
  return (startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / MS_PER_DAY;
}

function addDays(date, days) {
  const nextDate = startOfDay(date);
  nextDate.setDate(nextDate.getDate() + Math.round(days));
  return nextDate;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function blendCycleDays(baseCycleDays, recentCycleDays, adaptationWeight) {
  return baseCycleDays * (1 - adaptationWeight) + recentCycleDays * adaptationWeight;
}

function clamp(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return min;
  return Math.min(Math.max(numericValue, min), max);
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundDays(value) {
  return Math.round(value * 100) / 100;
}

function roundRatio(value) {
  return Math.round(value * 10000) / 10000;
}

function toDateOnlyString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
