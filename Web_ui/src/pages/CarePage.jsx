import { ChartColumnIncreasing } from "lucide-react";
import SimpleTabPage from "./SimpleTabPage.jsx";

export default function CarePage() {
  return <SimpleTabPage icon={<ChartColumnIncreasing size={28} />} title="케어" text="제품 상태와 사용 리포트를 한눈에 볼 수 있게 준비 중이에요." />;
}
