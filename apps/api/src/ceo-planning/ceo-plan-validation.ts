const REQUIRED_SECTIONS = ["Mục tiêu", "Phân tích và bối cảnh", "Giả định và rủi ro", "Chiến lược đề xuất", "Công việc đề xuất", "Nhân viên AI phù hợp và lý do", "Chỉ số theo dõi"];

function incompleteTable(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index]!.includes("|")) continue;
    const rows: string[] = [];
    while (index < lines.length && lines[index]!.includes("|")) rows.push(lines[index++]!);
    index--;
    if (rows.length < 2 || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(rows[1]!)) return true;
    const columns = rows[0]!.split("|").length;
    if (rows.some((row) => row.split("|").length !== columns)) return true;
  }
  return false;
}

export function validateCeoPlanReport(markdown: string | null | undefined): string | null {
  const value = markdown?.trim();
  if (!value) return "CEO chưa trả về nội dung kế hoạch.";
  for (const section of REQUIRED_SECTIONS) {
    if (!new RegExp(`^#{1,4}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "mi").test(value)) return `Kế hoạch thiếu mục bắt buộc: ${section}.`;
  }
  if (incompleteTable(value)) return "Kế hoạch có bảng Markdown chưa hoàn chỉnh, có thể đã bị cắt giữa chừng.";
  return null;
}

export function ceoPlanApprovalError(task: { status: string; result: string | null } | null | undefined) {
  if (!task || task.status !== "completed") return "Chỉ có thể phê duyệt khi CEO đã hoàn tất kế hoạch.";
  return validateCeoPlanReport(task.result);
}
