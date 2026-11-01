import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideReplyAction, safeErrorSummary } from "./reply-guard.js";


describe("CSKH-03 - Reply guard", () => {
  it("lưu phản hồi khi hội thoại còn do AI xử lý", () => {
    assert.equal(
      decideReplyAction({ status: "unresolved", latestUserMessageId: "m1", triggerMessageId: "m1", reply: "Xin chào" }),
      "save_reply",
    );
  });

  it("bỏ kết quả khi nhân viên đã tiếp quản", () => {
    assert.equal(
      decideReplyAction({ status: "escalated", latestUserMessageId: "m1", triggerMessageId: "m1", reply: "Xin chào" }),
      "skip_not_active",
    );
  });

  it("bỏ kết quả khi hội thoại đã đóng", () => {
    assert.equal(
      decideReplyAction({ status: "resolved", latestUserMessageId: "m1", triggerMessageId: "m1", reply: "Xin chào" }),
      "skip_not_active",
    );
  });

  it("bỏ kết quả cũ khi đã có tin nhắn khách mới hơn", () => {
    assert.equal(
      decideReplyAction({ status: "unresolved", latestUserMessageId: "m2", triggerMessageId: "m1", reply: "Xin chào" }),
      "skip_superseded",
    );
  });

  it("AI lỗi hoặc rỗng thì chuyển nhân viên", () => {
    for (const reply of [null, undefined, "", "   "]) {
      assert.equal(
        decideReplyAction({ status: "unresolved", latestUserMessageId: "m1", triggerMessageId: "m1", reply }),
        "handoff_fallback",
      );
    }
  });

  it("AI lỗi nhưng đã có tin mới hơn thì không chuyển nhân viên nhầm", () => {
    assert.equal(
      decideReplyAction({ status: "unresolved", latestUserMessageId: "m2", triggerMessageId: "m1", reply: null }),
      "skip_superseded",
    );
  });

  it("hai tin đồng thời chỉ có đúng một lượt AI được ghi", () => {
    const latest = "m2";
    const results = ["m1", "m2"].map((trigger) =>
      decideReplyAction({ status: "unresolved", latestUserMessageId: latest, triggerMessageId: trigger, reply: "ok" }),
    );
    assert.deepEqual(results.filter((r) => r === "save_reply").length, 1);
  });

  it("log lỗi không chứa nội dung tin nhắn hay SQL", () => {
    const err = new Error('Failed query: insert ... params: ["số điện thoại 0909"]');
    (err as Error & { cause: unknown }).cause = { code: "23505" };
    const summary = safeErrorSummary(err);
    assert.equal(summary, "Error (code=23505)");
    assert.ok(!summary.includes("0909"));
    assert.equal(safeErrorSummary("x"), "UnknownError");
  });
});