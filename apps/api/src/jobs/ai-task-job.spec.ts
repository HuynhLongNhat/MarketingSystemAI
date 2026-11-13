import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseAiTaskJobData } from "./ai-task-job.js";

describe("AI task BullMQ payload", () => {
  it("keeps a valid task identity and queue timestamp", () => {
    assert.deepEqual(
      parseAiTaskJobData({
        taskId: "task-1",
        organizationId: "org-1",
        createdAt: "2026-11-13T00:00:00.000Z",
      }),
      {
        taskId: "task-1",
        organizationId: "org-1",
        createdAt: "2026-11-13T00:00:00.000Z",
      },
    );
  });

  it("rejects a missing task or Organization identity", () => {
    assert.throws(
      () => parseAiTaskJobData({ taskId: "task-1" }),
      /Invalid AI task job data/,
    );
    assert.throws(
      () => parseAiTaskJobData({ organizationId: "org-1" }),
      /Invalid AI task job data/,
    );
  });
});
