import { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Droplet,
  Heart,
  Settings,
  ShowerHead,
  Smile,
  WashingMachine,
  Wind,
  Snowflake,
  Zap,
} from "lucide-react";
import washerImage from "../assets/appliances/세탁기.png";
import dryerImage from "../assets/appliances/건조기.png";
import airconImage from "../assets/appliances/에어컨.png";
import "./CareReportTab.css";

const careSummary = {
  smartDiagnosisCount: 0,
  careAlertCount: 0,
  statusMessage: "모든 제품이 잘 관리되고 있어요.",
  subMessage: "계속 좋은 관리를 유지해보세요!",
};

const energyReport = {
  cost: 11050,
  usageKwh: 51.51,
  previousUsageKwh: 40.42,
  changeRate: 11.09,
};

const productFilters = [
  { id: "all", label: "전체" },
  { id: "water_purifier", label: "정수기" },
  { id: "washer", label: "세탁기" },
  { id: "dryer", label: "건조기" },
  { id: "air_conditioner", label: "에어컨 4대" },
];

const productReports = [
  {
    id: "water_purifier",
    name: "정수기",
    Icon: Droplet,
    iconClass: "water",
    title: "이만큼 썼어요!",
    message: (
      <>
        지난달과 <strong>비슷하게</strong> 마시고 있어요.
      </>
    ),
    metrics: [
      { label: "이번달 하루 평균", value: "4.3 L", subValue: "누적 76.9 L", highlight: true },
      { label: "지난달 하루 평균", value: "4.6 L", subValue: "누적 141.3 L" },
    ],
    trend: [42, 48, 45, 46, 44, 43],
  },
  {
    id: "washer",
    name: "세탁기",
    image: washerImage,
    title: "이번 달 세탁은 적절하게 사용하고 있어요.",
    metrics: [
      { label: "이번달 사용 횟수", value: "12 회", subValue: "지난달 13 회", highlight: true },
      { label: "이번달 사용량", value: "126 kWh", subValue: "지난달 132 kWh", highlight: true },
      { label: "효율 등급", value: "A", subValue: "좋은 사용 습관이에요!", grade: true },
    ],
    trend: [64, 58, 62, 55, 51, 48],
  },
  {
    id: "dryer",
    name: "건조기",
    image: dryerImage,
    title: "비 오는 날 사용량이 조금 늘었어요.",
    message: "습한 날에는 자동 건조 모드를 추천해요.",
    metrics: [
      { label: "이번달 사용 횟수", value: "8 회", subValue: "지난달 6 회", highlight: true },
      { label: "이번달 사용량", value: "98 kWh", subValue: "지난달 75 kWh", highlight: true },
      { label: "케어 팁", value: "자동 건조", subValue: "습한 날 추천" },
    ],
    trend: [34, 38, 42, 56, 61, 68],
  },
  {
    id: "air_conditioner",
    name: "에어컨 4대",
    image: airconImage,
    title: "4대 전체 사용 시간이 늘고 있어요.",
    message: "방별 사용 패턴을 나눠 보면 거실 사용량이 가장 높아요.",
    metrics: [
      { label: "이번달 총 사용 시간", value: "42 시간", subValue: "4대 합산 · 지난달 28 시간", highlight: true },
      { label: "이번달 총 사용량", value: "210 kWh", subValue: "4대 합산 · 지난달 168 kWh", highlight: true },
      { label: "케어 팁", value: "필터 청소", subValue: "4대 순차 점검 추천" },
    ],
    units: [
      { name: "거실", usage: "18시간", status: "사용량 높음" },
      { name: "수민 방", usage: "9시간", status: "적정" },
      { name: "다빈 방", usage: "8시간", status: "적정" },
      { name: "재혁 방", usage: "7시간", status: "절전 양호" },
    ],
    trend: [40, 52, 58, 66, 74, 82],
  },
];

export default function CareReportTab({ onOpenNotifications, onShowAllAirconPopups }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [activeModal, setActiveModal] = useState(null);

  const visibleMonth = useMemo(() => {
    const date = new Date(2025, 5 + monthOffset, 1);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  }, [monthOffset]);

  const filteredReports = useMemo(
    () => (selectedProduct === "all" ? productReports : productReports.filter((report) => report.id === selectedProduct)),
    [selectedProduct],
  );

  function handlePrevMonth() {
    setMonthOffset((current) => current - 1);
  }

  function handleNextMonth() {
    setMonthOffset((current) => current + 1);
  }

  function handleOpenCareSummary() {
    setActiveModal("careSummary");
  }

  function handleOpenEnergyDetail() {
    setActiveModal("energy");
  }

  function handleSelectProductFilter(filterName) {
    setSelectedProduct(filterName);
  }

  function formatCurrency(value) {
    return Number(value).toLocaleString("ko-KR");
  }

  return (
    <section className="care-report-page" aria-label="케어 리포트">
      <header className="care-report-header">
        <div>
          <h1>케어 리포트</h1>
          <p>우리 집과 가족을 더 편안하게 관리해요</p>
        </div>
        <div className="care-report-header-actions">
          <button type="button" aria-label="전체 에어컨 팝업 띄우기" title="전체 에어컨 팝업 띄우기" onClick={onShowAllAirconPopups}>
            <Snowflake size={23} />
          </button>
          <button type="button" aria-label="알림" onClick={onOpenNotifications}>
            <Bell size={24} />
            <i aria-hidden="true" />
          </button>
          <button type="button" aria-label="설정">
            <Settings size={24} />
          </button>
        </div>
      </header>

      <MonthSelector monthLabel={visibleMonth} onPrev={handlePrevMonth} onNext={handleNextMonth} />

      <section className="care-report-section">
        <div className="care-report-section-head">
          <h2>우리집 제품 케어</h2>
          <button type="button" aria-label="제품 케어 상세 보기" onClick={handleOpenCareSummary}>
            <ChevronRight size={25} />
          </button>
        </div>
        <CareSummaryCard summary={careSummary} onClick={handleOpenCareSummary} />
      </section>

      <section className="care-report-section">
        <h2>제품 에너지 사용량</h2>
        <EnergyUsageCard report={energyReport} formatCurrency={formatCurrency} onOpenDetail={handleOpenEnergyDetail} />
      </section>

      <section className="care-report-section">
        <h2>제품 사용 리포트</h2>
        <ProductReportFilter selectedProduct={selectedProduct} onSelect={handleSelectProductFilter} />
        <div className="care-product-report-list">
          {filteredReports.map((report) => (
            <ProductReportCard key={report.id} report={report} />
          ))}
        </div>
      </section>

      {activeModal && (
        <CareReportModal type={activeModal} summary={careSummary} energy={energyReport} formatCurrency={formatCurrency} onClose={() => setActiveModal(null)} />
      )}
    </section>
  );
}

function MonthSelector({ monthLabel, onPrev, onNext }) {
  return (
    <div className="care-month-selector" aria-label="월 선택">
      <button type="button" aria-label="이전 월" onClick={onPrev}>
        <ChevronLeft size={22} />
      </button>
      <span>
        <CalendarDays size={17} />
        {monthLabel}
      </span>
      <button type="button" aria-label="다음 월" onClick={onNext}>
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

function CareSummaryCard({ summary, onClick }) {
  return (
    <button className="care-summary-card" type="button" onClick={onClick}>
      <div className="care-summary-main">
        <span className="care-face-icon" aria-hidden="true">
          <Smile size={28} />
        </span>
        <div>
          <strong>{summary.statusMessage}</strong>
          <p>{summary.subMessage}</p>
        </div>
      </div>
      <div className="care-summary-stat-grid">
        <article>
          <ClipboardCheck size={24} />
          <span>스마트 진단</span>
          <strong>{summary.smartDiagnosisCount}</strong>
        </article>
        <article>
          <Bell size={23} />
          <span>케어 알림</span>
          <strong>{summary.careAlertCount}</strong>
        </article>
      </div>
    </button>
  );
}

function EnergyUsageCard({ report, formatCurrency, onOpenDetail }) {
  return (
    <article className="care-energy-card">
      <div className="care-energy-visual" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <i>
          <Zap size={25} fill="currentColor" />
        </i>
      </div>
      <div className="care-energy-body">
        <strong>{formatCurrency(report.cost)} <small>원</small></strong>
        <p>{report.usageKwh} <span>kWh</span></p>
        <em>지난달 같은 기간 {report.previousUsageKwh} kWh</em>
        <button type="button" onClick={onOpenDetail}>
          자세히 보기 <ChevronRight size={17} />
        </button>
      </div>
      <span className="care-energy-rate">+{report.changeRate}%</span>
    </article>
  );
}

function ProductReportFilter({ selectedProduct, onSelect }) {
  return (
    <div className="care-product-filter" aria-label="제품 사용 리포트 필터">
      {productFilters.map((filter) => (
        <button type="button" className={selectedProduct === filter.id ? "active" : ""} key={filter.id} onClick={() => onSelect(filter.id)}>
          {getFilterIcon(filter.id)}
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
  );
}

function ProductReportCard({ report }) {
  const Icon = report.Icon;

  return (
    <article className="care-product-card">
      <div className="care-product-title-row">
        <span className={`care-product-icon ${report.iconClass || ""}`} aria-hidden="true">
          {report.image ? <img src={report.image} alt="" /> : Icon ? <Icon size={27} fill="currentColor" /> : <Heart size={27} />}
        </span>
        <div>
          <h3>{report.name}</h3>
          <p>{report.title}</p>
          {report.message && <p className="care-product-message">{report.message}</p>}
        </div>
      </div>
      <div className={`care-product-metrics metric-count-${report.metrics.length}`}>
        {report.metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong className={metric.grade ? "grade" : metric.highlight ? "highlight" : ""}>{metric.value}</strong>
            <em>{metric.subValue}</em>
          </article>
        ))}
      </div>
      {report.units && (
        <div className="care-aircon-unit-grid" aria-label="에어컨 4대 사용 요약">
          {report.units.map((unit) => (
            <article key={unit.name}>
              <strong>{unit.name}</strong>
              <span>{unit.usage}</span>
              <em>{unit.status}</em>
            </article>
          ))}
        </div>
      )}
      {report.trend && <MiniTrendChart values={report.trend} />}
    </article>
  );
}

function MiniTrendChart({ values }) {
  return (
    <div className="care-mini-chart" aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ "--chart-value": `${value}%` }} />
      ))}
    </div>
  );
}

function CareReportModal({ type, summary, energy, formatCurrency, onClose }) {
  const isEnergy = type === "energy";

  return (
    <div className="care-report-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="care-report-modal" role="dialog" aria-modal="true" aria-label={isEnergy ? "에너지 상세" : "제품 케어 상세"} onClick={(event) => event.stopPropagation()}>
        <h2>{isEnergy ? "에너지 사용량 상세" : "우리집 제품 케어"}</h2>
        {isEnergy ? (
          <div className="care-modal-detail-list">
            <p>이번 달 사용량 <strong>{energy.usageKwh} kWh</strong></p>
            <p>지난달 같은 기간 <strong>{energy.previousUsageKwh} kWh</strong></p>
            <p>증감률 <strong>+{energy.changeRate}%</strong></p>
            <span>이번 달 제품 에너지 사용량이 지난달보다 조금 높아요.</span>
          </div>
        ) : (
          <div className="care-modal-detail-list">
            <p>스마트 진단 <strong>{summary.smartDiagnosisCount}건</strong></p>
            <p>케어 알림 <strong>{summary.careAlertCount}건</strong></p>
            <span>현재 점검이 필요한 제품은 없습니다.</span>
          </div>
        )}
        <button type="button" onClick={onClose}>
          확인
        </button>
      </section>
    </div>
  );
}

function getFilterIcon(id) {
  if (id === "water_purifier") return <ShowerHead size={21} />;
  if (id === "washer") return <img src={washerImage} alt="" />;
  if (id === "dryer") return <img src={dryerImage} alt="" />;
  if (id === "air_conditioner") return <img src={airconImage} alt="" />;
  return null;
}
