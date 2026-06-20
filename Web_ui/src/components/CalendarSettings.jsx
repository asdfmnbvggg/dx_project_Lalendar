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
    description: "현재 화면 그대로",
    colors: ["#f3f4f6", "#d1d5db"],
  },
  {
    value: "fresh",
    label: "산뜻한 하루",
    description: "맑고 가벼운 일정 시작",
    colors: ["#96CFF5", "#CBF39E"],
  },
  {
    value: "cozy",
    label: "포근한 하루",
    description: "따뜻하고 안정적인 일정 관리",
    colors: ["#FFC592", "#FFE8A5"],
  },
  {
    value: "active",
    label: "활기찬 하루",
    description: "바쁘지만 에너지 있는 하루",
    colors: ["#FF8D27", "#FFB063"],
  },
  {
    value: "warm",
    label: "다정한 하루",
    description: "돌봄 일정에 어울리는 분위기",
    colors: ["#FF7A77", "#FFC592"],
  },
  {
    value: "dreamy",
    label: "몽글한 하루",
    description: "감성적이고 차분한 하루 기록",
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
            {activeMood.colors.map((color) => (
              <i key={color} style={{ background: color }} />
            ))}
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
          <span>오늘의 내 기분에 맞게 캘린더 분위기를 바꿔보세요.</span>
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
                  {option.colors.map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            );
          })}
        </div>
      </div>}

      {showFont && <div className="calendar-settings-section">
        <div className="calendar-settings-title">
          <strong>글자 크기</strong>
          <span>캘린더 날짜, 일정, 가사일, 데일리 리포트 텍스트에 적용돼요.</span>
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
          <span>일간, 주간, 월간 화면을 선택해 주세요.</span>
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
