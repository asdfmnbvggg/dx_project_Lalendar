import { Bell, ChevronDown, MoreVertical, Pencil, Plus } from "lucide-react";

export default function HomePage({ onOpenNotifications, onOpenThinQ }) {
  return (
    <section className="thinq-home-page" aria-label="홈">
      <header className="thinq-statusbar" aria-label="상태 표시줄">
        <strong>6:21</strong>
        <span>⌁ 5G ▮▮ 63</span>
      </header>

      <div className="thinq-home-top">
        <button className="thinq-home-selector" type="button">
          <strong>엘린이의 홈</strong>
          <ChevronDown size={24} />
        </button>
        <div className="thinq-home-actions">
          <button type="button" aria-label="추가">
            <Plus size={34} strokeWidth={1.6} />
          </button>
          <button className="thinq-bell-button" type="button" aria-label="알림" onClick={onOpenNotifications}>
            <Bell size={29} fill="currentColor" strokeWidth={1.6} />
            <i aria-hidden="true" />
          </button>
          <button type="button" aria-label="더보기">
            <MoreVertical size={31} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <section className="thinq-event-card">
        <div className="thinq-temp-badge" aria-hidden="true">
          <span>26°C</span>
        </div>
        <div>
          <h1>여름철 에어컨 에너지도 아끼면서 풍성한 혜택도 함께 받아보세요!</h1>
          <button type="button">이벤트 알아보기</button>
        </div>
      </section>

      <section className="thinq-homeview-card">
        <div className="thinq-homeview-model" aria-hidden="true">
          <div className="model-floor" />
          <div className="model-wall wall-a" />
          <div className="model-wall wall-b" />
          <div className="model-wall wall-c" />
          <div className="model-sofa" />
          <div className="model-tv" />
          <div className="model-bed" />
          <div className="model-fridge" />
          <div className="model-washer" />
          <div className="model-plant plant-a" />
          <div className="model-plant plant-b" />
        </div>
        <p>3D 홈뷰를 만들고 있어요.</p>
      </section>

      <section className="thinq-favorites-section">
        <h2>즐겨 찾는 제품</h2>
        <div className="thinq-favorites-empty">
          <p>자주 쓰는 제품을 배치해 홈 화면에서 바로 사용해보세요.</p>
          <button type="button">
            <Pencil size={22} fill="currentColor" />
            편집하기
          </button>
        </div>
      </section>

      <button className="thinq-play-banner" type="button" onClick={onOpenThinQ}>
        <span className="thinq-play-icon" aria-hidden="true" />
        <span>
          <strong>ThinQ PLAY</strong>
          앱을 다운로드하여 제품과 공간을 업그레이드해보세요.
        </span>
        <i aria-hidden="true">∞</i>
      </button>

      <section className="thinq-smart-routine">
        <h2>스마트 루틴</h2>
      </section>
    </section>
  );
}
