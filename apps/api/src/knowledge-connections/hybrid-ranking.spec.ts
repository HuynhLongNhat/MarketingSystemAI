import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rankLexicalCandidates, reciprocalRankFusion } from "./hybrid-ranking.js";

const candidates = [
  {
    documentId: "doc-a",
    documentTitle: "Thông tin doanh nghiệp",
    chunkId: "intro",
    content: "Quy Nhơn Digital cung cấp thiết kế website và SEO.",
    similarity: 0.59,
  },
  {
    documentId: "doc-a",
    documentTitle: "Thông tin doanh nghiệp",
    chunkId: "pricing",
    content: "Website bán hàng | Giá: 9.500.000 VNĐ | Thời gian: 25 ngày làm việc | Bảo hành lỗi kỹ thuật: 18 tháng. Giá chưa gồm VAT 8%, tên miền và hosting.",
    similarity: 0.44,
  },
  {
    documentId: "doc-a",
    documentTitle: "Thông tin doanh nghiệp",
    chunkId: "corporate",
    content: "Website giới thiệu doanh nghiệp | Giá: 5.000.000 VNĐ | Bảo hành lỗi kỹ thuật: 12 tháng.",
    similarity: 0.50,
  },
];

describe("hybrid document retrieval", () => {
  it("prioritizes the exact sales-website price evidence over a higher weak semantic candidate", () => {
    const lexical = rankLexicalCandidates(candidates, "Website bán hàng giá bao nhiêu?");
    const final = reciprocalRankFusion(candidates, lexical, 5);
    assert.equal(lexical[0]?.chunkId, "pricing");
    assert.equal(final[0]?.chunkId, "pricing");
  });

  it("finds warranty evidence without relying on the former 0.72 vector cutoff", () => {
    const lexical = rankLexicalCandidates(candidates, "Website bán hàng bảo hành bao lâu?");
    assert.equal(lexical[0]?.chunkId, "pricing");
    assert.ok((lexical[0]?.lexicalScore ?? 0) > 0);
  });

  it("does not produce a lexical candidate for unsupported TikTok Ads question", () => {
    assert.deepEqual(
      rankLexicalCandidates(candidates, "Có chạy quảng cáo TikTok không?"),
      [],
    );
  });
});
