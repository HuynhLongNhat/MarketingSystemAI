import assert from "node:assert/strict";
import test from "node:test";
import { ceoPlanApprovalError, validateCeoPlanReport } from "./ceo-plan-validation.js";
import { isTruncatedFinishReason } from "../tasks/task-ai-execution.service.js";

const valid = `# Mục tiêu\nTăng trưởng có kiểm soát.\n## Phân tích và bối cảnh\nBối cảnh.\n## Giả định và rủi ro\nRủi ro.\n## Chiến lược đề xuất\nChiến lược.\n## Công việc đề xuất\n| Công việc | Owner |\n| --- | --- |\n| Phân tích | Research Agent |\n## Nhân viên AI phù hợp và lý do\nResearch Agent phù hợp.\n## Chỉ số theo dõi\nTỷ lệ chuyển đổi.`;

test("accepts a complete CEO plan", () => assert.equal(validateCeoPlanReport(valid), null));
test("rejects a report missing a required section", () => assert.match(validateCeoPlanReport(valid.replace("## Chỉ số theo dõi\nTỷ lệ chuyển đổi.", "")) ?? "", /Chỉ số theo dõi/));
test("rejects a truncated markdown table", () => assert.match(validateCeoPlanReport(valid.replace("| Phân tích | Research Agent |", "| Phân tích |")) ?? "", /bảng Markdown/));
test("allows approval only for a completed, valid plan", () => {
  assert.match(ceoPlanApprovalError({ status: "running", result: valid }) ?? "", /hoàn tất/);
  assert.match(ceoPlanApprovalError({ status: "completed", result: "# Mục tiêu" }) ?? "", /thiếu mục/);
  assert.equal(ceoPlanApprovalError({ status: "completed", result: valid }), null);
});

test("recognises provider output stopped at its token limit", () => {
  assert.equal(isTruncatedFinishReason("length"), true);
  assert.equal(isTruncatedFinishReason("max_tokens"), true);
  assert.equal(isTruncatedFinishReason("stop"), false);
});
