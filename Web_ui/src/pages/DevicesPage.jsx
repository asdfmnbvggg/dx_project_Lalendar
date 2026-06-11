import { Grid2X2 } from "lucide-react";
import SimpleTabPage from "./SimpleTabPage.jsx";

export default function DevicesPage() {
  return <SimpleTabPage icon={<Grid2X2 size={28} />} title="디바이스" text="자주 쓰는 제품을 홈 화면에 배치해 바로 사용할 수 있어요." />;
}
