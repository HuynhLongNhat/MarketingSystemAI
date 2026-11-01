
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_KNOWLEDGE_CHARACTERS,
  normalizeText,
  selectKnowledge,
  selectKnowledgeMatches,
  type KnowledgeItem,
} from "./knowledge-ranking.js";

const entries: KnowledgeItem[] = [
  {
    question: "Chính sách đổi trả hàng như thế nào?",
    answer: "Được đổi trả trong 7 ngày.",
    category: "Đổi trả",
  },
  {
    question: "Giao hàng toàn quốc mất bao lâu?",
    answer: "Giao hàng từ 2 đến 4 ngày.",
    category: "Vận chuyển",
  },
  {
    question: "Shop bảo hành sản phẩm trong bao lâu?",
    answer: "Bảo hành 12 tháng.",
    category: "Bảo hành",
  },
];

describe("CSKH-06 - Knowledge retrieval", () => {
  it("chuẩn hóa tiếng Việt có dấu và không dấu", () => {
    assert.equal(
      normalizeText("ĐỔI TRẢ / GIAO-HÀNG"),
      "doi tra giao hang",
    );
  });

  it("ưu tiên đúng chủ đề giao hàng", () => {
    const matched = selectKnowledgeMatches(
      entries,
      "shop co giao hang toan quoc khong",
    );

    assert.equal(
      matched[0]?.entry.question,
      entries[1]?.question,
    );

    assert.ok(
      matched[0]?.matchedKeywords.includes("giao"),
    );
  });

  it("không nhầm bảo hành với giao hàng", () => {
    const matched = selectKnowledge(
      entries,
      "Bảo hành sản phẩm này bao lâu?",
    );

    assert.equal(
      matched[0]?.question,
      entries[2]?.question,
    );

    assert.ok(
      !matched.some(
        (entry) =>
          entry.question === entries[1]?.question,
      ),
    );
  });

  it("không lấy FAQ khi câu hỏi không liên quan", () => {
    assert.deepEqual(
      selectKnowledge(entries, "Xin chào"),
      [],
    );
  });

  it("giới hạn context đưa vào prompt", () => {
    const longEntries = Array.from(
      { length: 30 },
      (_, index): KnowledgeItem => ({
        question:
          `Giao hàng toàn quốc trường hợp ${index}`,
        answer:
          "Có hỗ trợ giao hàng. ".repeat(100),
        category: "Vận chuyển",
      }),
    );

    const result = selectKnowledge(
      longEntries,
      "giao hang toan quoc",
    );

    assert.ok(result.length > 0);
    assert.ok(result.length <= 20);

    assert.ok(
      JSON.stringify(result).length <=
        MAX_KNOWLEDGE_CHARACTERS,
    );
  });
});
