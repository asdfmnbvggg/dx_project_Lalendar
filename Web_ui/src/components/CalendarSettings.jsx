import { CalendarDays, Palette, RotateCcw, Type } from "lucide-react";

export const DEFAULT_CALENDAR_SETTINGS = {
  moodTheme: "default",
  fontSizeMode: "default",
  calendarViewMode: "month",
};

export const CALENDAR_SETTINGS_STORAGE_KEY = "l-landerCalendarSettings";

const moodOptions = [
  {
    value: "default",
    label: "기본 모드",
    colors: ["#f3f4f6", "#d1d5db"],
  },
  {
    value: "fresh",
    label: "산뜻한 하루",
    colors: ["#96CFF5", "#CBF39E"],
  },
  {
    value: "cozy",
    label: "포근한 하루",
    colors: ["#FFC592", "#FFE8A5"],
  },
  {
    value: "active",
    label: "활기찬 하루",
    colors: ["#FF8D27", "#FFB063"],
  },
  {
    value: "warm",
    label: "다정한 하루",
    colors: ["#FF7A77", "#FFC592"],
  },
  {
    value: "dreamy",
    label: "몽글한 하루",
    colors: ["#D3B5F3", "#96CFF5"],
  },
];

const fontSizeOptions = [
  ["small", "작게"],
  ["default", "기본"],
  ["large", "크게"],
];

const viewModeOptions = [
  ["day", "일간 보기"],
  ["week", "주간 보기"],
  ["month", "월간 보기"],
];

export function normalizeCalendarSettings(settings = {}) {
  const moodValues = new Set(moodOptions.map((option) => option.value));
  const fontValues = new Set(fontSizeOptions.map(([value]) => value));
  const viewValues = new Set(viewModeOptions.map(([value]) => value));

  return {
    moodTheme: moodValues.has(settings.moodTheme) ? settings.moodTheme : DEFAULT_CALENDAR_SETTINGS.moodTheme,
    fontSizeMode: fontValues.has(settings.fontSizeMode) ? settings.fontSizeMode : DEFAULT_CALENDAR_SETTINGS.fontSizeMode,
    calendarViewMode: viewValues.has(settings.calendarViewMode) ? settings.calendarViewMode : DEFAULT_CALENDAR_SETTINGS.calendarViewMode,
  };
}

export function readStoredCalendarSettings() {
  if (typeof localStorage === "undefined") return DEFAULT_CALENDAR_SETTINGS;

  try {
    const storedValue = localStorage.getItem(CALENDAR_SETTINGS_STORAGE_KEY);
    return storedValue ? normalizeCalendarSettings(JSON.parse(storedValue)) : DEFAULT_CALENDAR_SETTINGS;
  } catch {
    localStorage.removeItem(CALENDAR_SETTINGS_STORAGE_KEY);
    return DEFAULT_CALENDAR_SETTINGS;
  }
}

export default function CalendarSettings({ settings, onChange, onReset, onNavigate, section = "all" }) {
  const normalizedSettings = normalizeCalendarSettings(settings);
  const showMood = section === "all" || section === "mood";
  const showFont = section === "all" || section === "font";
  const showView = section === "all" || section === "view";

  function updateSetting(field, value) {
    onChange?.({ ...normalizedSettings, [field]: value });
  }

  if (section === "menu") {
    const activeMood = moodOptions.find((option) => option.value === normalizedSettings.moodTheme) || moodOptions[0];
    const activeFont = fontSizeOptions.find(([value]) => value === normalizedSettings.fontSizeMode)?.[1] || "기본";
    const activeView = viewModeOptions.find(([value]) => value === normalizedSettings.calendarViewMode)?.[1] || "월간 보기";

    return (
      <section className="calendar-settings-panel calendar-settings-menu" aria-label="캘린더 설정">
        <article className="calendar-settings-summary">
          <span className="mood-chip-row" aria-hidden="true">
            <i style={{ background: activeMood.colors[0] }} />
          </span>
          <div>
            <strong>{activeMood.label}</strong>
            <small>
              {activeFont} · {activeView}
            </small>
          </div>
        </article>
        <div className="settings-menu-list calendar-settings-submenu">
          <button type="button" onClick={() => onNavigate?.("calendarMood")}>
            <span>
              <Palette size={16} />
              오늘의 무드
            </span>
            <small>{activeMood.label}</small>
          </button>
          <button type="button" onClick={() => onNavigate?.("calendarFont")}>
            <span>
              <Type size={16} />
              글자 크기
            </span>
            <small>{activeFont}</small>
          </button>
          <button type="button" onClick={() => onNavigate?.("calendarView")}>
            <span>
              <CalendarDays size={16} />
              보기 방식
            </span>
            <small>{activeView}</small>
          </button>
        </div>
        <button type="button" className="calendar-settings-reset" onClick={onReset}>
          <RotateCcw size={15} />
          기본값으로 되돌리기
        </button>
      </section>
    );
  }

  return (
    <section className="calendar-settings-panel" aria-label="캘린더 설정">
      {showMood && <div className="calendar-settings-section">
        <div className="calendar-settings-title">
          <strong>오늘의 무드</strong>
        </div>
        <div className="mood-card-grid" aria-label="오늘의 무드 선택">
          {moodOptions.map((option) => {
            const isSelected = normalizedSettings.moodTheme === option.value;
            return (
              <button
                type="button"
                key={option.value}
                className={["mood-card", isSelected ? "active" : ""].filter(Boolean).join(" ")}
                style={{ "--mood-accent": option.colors[0] }}
                aria-pressed={isSelected}
                onClick={() => updateSetting("moodTheme", option.value)}
              >
                <span className="mood-chip-row" aria-hidden="true">
                  <i style={{ background: option.colors[0] }} />
                </span>
                <strong>{option.label}</strong>
              </button>
            );
          })}
        </div>
      </div>}

      {showFont && <div className="calendar-settings-section">
        <div className="calendar-settings-title">
          <strong>글자 크기</strong>
        </div>
        <div className="calendar-segmented-control" aria-label="글자 크기 변경">
          {fontSizeOptions.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={normalizedSettings.fontSizeMode === value ? "active" : ""}
              aria-pressed={normalizedSettings.fontSizeMode === value}
              onClick={() => updateSetting("fontSizeMode", value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>}

      {showView && <div className="calendar-settings-section">
        <div className="calendar-settings-title">
          <strong>보기 방식</strong>
        </div>
        <div className="calendar-segmented-control calendar-view-mode-control" aria-label="캘린더 뷰어 변경">
          {viewModeOptions.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={normalizedSettings.calendarViewMode === value ? "active" : ""}
              aria-pressed={normalizedSettings.calendarViewMode === value}
              onClick={() => updateSetting("calendarViewMode", value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>}

      {section === "all" && <button type="button" className="calendar-settings-reset" onClick={onReset}>
        <RotateCcw size={15} />
        기본값으로 되돌리기
      </button>}
    </section>
  );
}
