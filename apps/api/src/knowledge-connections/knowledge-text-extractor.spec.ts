import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chunkDocumentText } from "./knowledge-text-extractor.js";

describe("structure-aware knowledge chunking", () => {
  it("keeps a table row's service, price, delivery and warranty together", () => {
    const chunks = chunkDocumentText(`BẢNG GIÁ DỊCH VỤ\n\nWebsite giới thiệu | 5.000.000 VNĐ | 14 ngày | Bảo hành lỗi kỹ thuật 12 tháng\nWebsite bán hàng | 9.500.000 VNĐ | 25 ngày | Bảo hành lỗi kỹ thuật 18 tháng\n\nGiá chưa gồm VAT 8%, tên miền và hosting.`);
    const salesChunk = chunks.find((chunk) => chunk.includes("Website bán hàng"));
    assert.ok(salesChunk);
    assert.match(salesChunk, /9\.500\.000 VNĐ/);
    assert.match(salesChunk, /25 ngày/);
    assert.match(salesChunk, /18 tháng/);
  });

  it("retains a heading as context for the following policy paragraph", () => {
    const chunks = chunkDocumentText(`CHÍNH SÁCH THANH TOÁN\n\nWebsite đặt cọc 40% khi ký hợp đồng. Phần còn lại thanh toán sau nghiệm thu.\n\nCHÍNH SÁCH HOÀN TIỀN\n\nKhoản đặt cọc không hoàn lại sau khi đội ngũ bắt đầu triển khai.`);
    assert.ok(chunks.some((chunk) => chunk.includes("CHÍNH SÁCH THANH TOÁN") && chunk.includes("40%")));
    assert.ok(chunks.some((chunk) => chunk.includes("CHÍNH SÁCH HOÀN TIỀN") && chunk.includes("không hoàn lại")));
  });
});
