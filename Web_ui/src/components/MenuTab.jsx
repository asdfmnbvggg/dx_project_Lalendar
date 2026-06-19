import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Compass,
  Dumbbell,
  FlaskConical,
  Headphones,
  Info,
  Megaphone,
  NotebookTabs,
  RotateCcw,
  Settings,
  ShoppingBag,
  Stethoscope,
  UserRound,
} from "lucide-react";
import "./MenuTab.css";

const managementItems = [
  { label: "스마트 진단", icon: Stethoscope, tone: "red" },
  { label: "제품 정보와 보증", icon: Info, tone: "blue" },
  { label: "제품 사용설명서", icon: BookOpen, tone: "teal" },
  { label: "LG전자 구독", icon: CalendarDays, tone: "red", badge: "i" },
];

const appItems = [
  { label: "ThinQ PLAY", icon: NotebookTabs, tone: "play", notice: true },
  { label: "스마트 루틴", icon: RotateCcw, tone: "purple" },
  { label: "ThinQ 활용하기", icon: Compass, tone: "violet" },
];

const partnerItems = [
  { label: "우리 단지", icon: Building2, tone: "building" },
  { label: "생활 서비스", icon: Bell, tone: "yellow" },
  { label: "LG 피트니스", icon: Dumbbell, tone: "orange" },
];

const footerLinks = [
  ["LGE.COM", "LG전자 멤버십", "LG 베스트샵"],
  ["개인정보처리방침", "이벤트 개인정보처리방침"],
  ["이용약관", "위치기반서비스 이용약관"],
];

export default function MenuTab({ onOpenNotifications }) {
  return (
    <section className="menu-tab-page" aria-label="메뉴">
      <header className="menu-tab-header">
        <h1>LG ThinQ</h1>
        <div>
          <button type="button" aria-label="알림" onClick={onOpenNotifications}>
            <Megaphone size={25} />
            <i aria-hidden="true" />
          </button>
          <button type="button" aria-label="설정">
            <Settings size={28} />
          </button>
        </div>
      </header>

      <section className="menu-tab-quick" aria-label="바로가기">
        <button type="button">
          <UserRound size={34} />
          <span>마이페이지</span>
        </button>
        <button type="button">
          <Headphones size={34} />
          <span>고객 지원</span>
        </button>
      </section>

      <button className="menu-tab-promo" type="button" aria-label="LG전자 베스트샵 쿨 세일">
        <span aria-hidden="true">
          <i />
        </span>
        <strong>LG전자 베스트샵 쿨-세일</strong>
        <p>2품목 이상 구매/구독 시, 최대 650만 혜택!<br />~2026.06.30</p>
      </button>

      <MenuGroup title="제품 사용과 관리" items={managementItems} />
      <MenuGroup title="제품 및 앱 활용" items={appItems} />

      <section className="menu-tab-section">
        <h2>쇼핑</h2>
        <div className="menu-tab-card menu-tab-store-card">
          <button type="button">
            <span className="menu-tab-icon red">
              <ShoppingBag size={29} />
            </span>
            <strong>스토어</strong>
            <em>제품</em>
          </button>
        </div>
      </section>

      <MenuGroup title="제휴 서비스" items={partnerItems} />

      <section className="menu-tab-section">
        <div className="menu-tab-card menu-tab-lab-card">
          <button type="button">
            <span className="menu-tab-icon cyan">
              <FlaskConical size={29} />
            </span>
            <strong>실험실</strong>
          </button>
        </div>
      </section>

      <footer className="menu-tab-footer" aria-label="약관 및 링크">
        {footerLinks.map((row, index) => (
          <p key={index}>
            {row.map((link) => (
              <button type="button" key={link}>
                {link}
              </button>
            ))}
          </p>
        ))}
      </footer>
    </section>
  );
}

function MenuGroup({ title, items }) {
  return (
    <section className="menu-tab-section">
      <h2>{title}</h2>
      <div className="menu-tab-card">
        {items.map(({ label, icon: Icon, tone, notice, badge }) => (
          <button type="button" key={label}>
            <span className={`menu-tab-icon ${tone}`}>
              <Icon size={28} />
              {badge && <i aria-hidden="true">{badge}</i>}
            </span>
            <strong>{label}</strong>
            {notice && <em className="menu-tab-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </section>
  );
}
