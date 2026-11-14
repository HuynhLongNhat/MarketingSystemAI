import assert from "node:assert/strict";
import test from "node:test";
import { CeoPlanningService } from "./ceo-planning.service.js";

test("CEO planning prompt requires a compact, complete seven-section plan", () => {
  const service = new CeoPlanningService({} as never);
  const prompt = (Reflect.get(service, "prompt") as (objective: string) => string)("Mở rộng thị trường SME");
  const sections = ["# Mục tiêu", "## Phân tích và bối cảnh", "## Giả định và rủi ro", "## Chiến lược đề xuất", "## Công việc đề xuất", "## Nhân viên AI phù hợp và lý do", "## Chỉ số theo dõi"];
  let previous = -1;
  for (const section of sections) {
    const index = prompt.indexOf(section);
    assert.ok(index > previous, `missing or unordered section: ${section}`);
    previous = index;
  }
  assert.match(prompt, /tối đa 5 hàng công việc ưu tiên/);
  assert.match(prompt, /Ưu tiên \| Công việc \| Kết quả mong đợi \| Agent phù hợp/);
  assert.match(prompt, /Giả định:/);
  assert.match(prompt, /không tự tạo, giao hoặc thực thi/);
});
