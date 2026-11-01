
export type KnowledgeItem = {
  question: string;
  answer: string;
  category: string | null;
};

export type KnowledgeMatch = {
  entry: KnowledgeItem;
  score: number;
  matchedKeywords: string[];
};

export const MAX_KNOWLEDGE_ITEMS = 20;
export const MAX_KNOWLEDGE_CHARACTERS = 10000;
export const MIN_RELEVANCE_SCORE = 6;

const STOP_WORDS = new Set([
  "toi", "minh", "ban", "anh", "chi", "em", "cho", "con", "cac", "nhung",
  "mot", "nhu", "khong", "la", "va", "cua", "duoc", "nay", "khi",
  "thi", "nao", "sao", "nhe", "voi", "hay", "can", "muon", "xin",
  "vui", "long", "lam", "nhieu", "cung", "biet", "hoi", "the",
  "gi", "shop", "bao", "lau", "and", "for", "you", "are", "how",
  "what", "can", "your", "this", "that", "with", "have", "not",
  "does", "from", "the",
]);

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getKeywords(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
  );
}

function matchKnowledge(
  entry: KnowledgeItem,
  keywords: string[],
): KnowledgeMatch | null {
  const question = getKeywords(entry.question);
  const category = getKeywords(entry.category ?? "");
  const answer = getKeywords(entry.answer);

  const matchedKeywords = keywords.filter(
    (word) =>
      question.has(word) ||
      category.has(word) ||
      answer.has(word),
  );

  // Một từ chung như "hàng" không đủ để ghép
  // một câu hỏi dài với FAQ không cùng chủ đề.
  if (matchedKeywords.length < Math.min(2, keywords.length)) {
    return null;
  }

  const questionMatches = keywords.filter(
    (word) => question.has(word),
  );

  const categoryMatches = keywords.filter(
    (word) => category.has(word),
  );

  const answerMatches = keywords.filter(
    (word) => answer.has(word),
  );

  // Nếu chỉ khớp ở phần câu trả lời,
  // yêu cầu ít nhất hai từ khóa.
  if (
    questionMatches.length === 0 &&
    categoryMatches.length === 0 &&
    answerMatches.length < 2
  ) {
    return null;
  }

  let score =
    questionMatches.length * 5 +
    categoryMatches.length * 3 +
    answerMatches.length * 2 +
    Math.round(
      (matchedKeywords.length / keywords.length) * 4,
    );

  // Thưởng cho cặp từ đúng thứ tự trong câu hỏi FAQ.
  const questionText = ` ${normalizeText(entry.question)} `;

  for (
    let index = 0;
    index < keywords.length - 1;
    index += 1
  ) {
    const phrase =
      ` ${keywords[index]} ${keywords[index + 1]} `;

    if (questionText.includes(phrase)) {
      score += 4;
    }
  }

  if (score < MIN_RELEVANCE_SCORE) {
    return null;
  }

  return {
    entry,
    score,
    matchedKeywords,
  };
}

export function scoreKnowledge(
  item: KnowledgeItem,
  message: string,
): number {
  const keywords = [...getKeywords(message)];

  if (keywords.length === 0) {
    return 0;
  }

  return matchKnowledge(item, keywords)?.score ?? 0;
}

/**
 * Xếp hạng thuần, không truy cập DB.
 * Organization isolation được xử lý ở truy vấn DB.
 */
export function rankKnowledge(
  entries: KnowledgeItem[],
  message: string,
): KnowledgeMatch[] {
  const keywords = [...getKeywords(message)];

  if (keywords.length === 0) {
    return [];
  }

  return entries
    .map((entry, index) => ({
      result: matchKnowledge(entry, keywords),
      index,
    }))
    .filter(
      (
        item,
      ): item is {
        result: KnowledgeMatch;
        index: number;
      } => item.result !== null,
    )
    .sort(
      (a, b) =>
        b.result.score - a.result.score ||
        a.index - b.index,
    )
    .map(({ result }) => result);
}

/**
 * Chọn đúng FAQ đưa vào AI prompt:
 * - Giới hạn số lượng.
 * - Giới hạn tổng số ký tự JSON.
 * - Không để một FAQ quá dài chặn các FAQ ngắn hơn.
 */
export function selectKnowledgeMatches(
  entries: KnowledgeItem[],
  message: string,
): KnowledgeMatch[] {
  const matches = rankKnowledge(entries, message);
  const selected: KnowledgeMatch[] = [];

  let size = 2; // "[]"

  for (const match of matches) {
    if (selected.length >= MAX_KNOWLEDGE_ITEMS) {
      break;
    }

    const entry: KnowledgeItem = {
      question: match.entry.question.slice(0, 500),
      answer: match.entry.answer.slice(0, 2000),
      category: match.entry.category?.slice(0, 100) ?? null,
    };

    const extra =
      JSON.stringify(entry).length +
      (selected.length > 0 ? 1 : 0);

    if (size + extra > MAX_KNOWLEDGE_CHARACTERS) {
      continue;
    }

    selected.push({
      ...match,
      entry,
    });

    size += extra;
  }

  return selected;
}

/**
 * Tương thích với PublicWidgetAiService hiện tại.
 * Không cần sửa service sinh phản hồi AI.
 */
export function selectKnowledge(
  entries: KnowledgeItem[],
  message: string,
): KnowledgeItem[] {
  return selectKnowledgeMatches(
    entries,
    message,
  ).map(({ entry }) => entry);
}
