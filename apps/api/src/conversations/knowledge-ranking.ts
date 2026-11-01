export type KnowledgeItem = {
  question: string;
  answer: string;
  category: string | null;
};

export const MAX_KNOWLEDGE_ITEMS = 20;
export const MAX_KNOWLEDGE_CHARACTERS = 10000;

/**
 * Điểm tối thiểu để một FAQ được đưa vào prompt.
 * Trùng 1 từ khóa ở câu hỏi (3 điểm) là đủ;
 * nếu chỉ trùng ở phần trả lời (1 điểm/từ) cần ít nhất 3 từ.
 */
export const MIN_RELEVANCE_SCORE = 3;

const STOP_WORDS = new Set([
  // Tiếng Việt (đã bỏ dấu)
  "toi", "minh", "ban", "cho", "con", "cac", "nhung", "mot", "nhu",
  "khong", "la", "va", "cua", "duoc", "nay", "khi", "thi", "nao",
  "sao", "nhe", "voi", "hay", "can", "muon", "xin", "vui", "long",
  "lam", "bao", "nhieu", "cung", "cac", "nhan", "biet", "hoi",
  "the", "nao", "gi",
  // Tiếng Anh
  "and", "for", "you", "are", "how", "what", "can", "your", "this",
  "that", "with", "have", "not", "does", "from", "the",
]);

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function getKeywords(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
  );
}

export function scoreKnowledge(item: KnowledgeItem, message: string): number {
  const keywords = getKeywords(message);

  if (keywords.size === 0) {
    return 0;
  }

  const questionWords = getKeywords(item.question);
  const answerWords = getKeywords(item.answer);
  const categoryWords = getKeywords(item.category ?? "");

  let score = 0;

  for (const keyword of keywords) {
    if (questionWords.has(keyword)) score += 3;
    if (categoryWords.has(keyword)) score += 2;
    if (answerWords.has(keyword)) score += 1;
  }

  return score;
}

/**
 * Chọn các FAQ thật sự liên quan tới câu hỏi.
 * - Loại FAQ dưới ngưỡng điểm (không còn nhồi FAQ ngẫu nhiên).
 * - Giới hạn số mục và tổng số ký tự JSON.
 * Hàm thuần: không truy cập DB; việc lọc theo organization
 * phải được thực hiện ở truy vấn lấy `entries`.
 */
export function selectKnowledge(
  entries: KnowledgeItem[],
  message: string,
): KnowledgeItem[] {
  const ranked = entries
    .map((entry, index) => ({
      entry,
      index,
      score: scoreKnowledge(entry, message),
    }))
    .filter((item) => item.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_KNOWLEDGE_ITEMS);

  const selected: KnowledgeItem[] = [];
  let size = 2; // "[]"

  for (const { entry } of ranked) {
    const candidate: KnowledgeItem = {
      question: entry.question.slice(0, 500),
      answer: entry.answer.slice(0, 2000),
      category: entry.category?.slice(0, 100) ?? null,
    };

    const added =
      JSON.stringify(candidate).length + (selected.length > 0 ? 1 : 0);

    if (size + added > MAX_KNOWLEDGE_CHARACTERS) {
      break;
    }

    selected.push(candidate);
    size += added;
  }

  return selected;
}