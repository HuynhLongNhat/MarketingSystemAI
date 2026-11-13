import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAttemptTaskExecution,
  canWorkerClaimTask,
  MAX_TASK_EXECUTIONS,
} from "./task-execution-state.js";

describe("AI task execution state", () => {
  it("allows queued and retrying running work", () => {
    assert.equal(canWorkerClaimTask("queued"), true);
    assert.equal(canWorkerClaimTask("running"), true);
  });

  it("never resurrects cancelled, completed, or failed work", () => {
    assert.equal(canWorkerClaimTask("cancelled"), false);
    assert.equal(canWorkerClaimTask("completed"), false);
    assert.equal(canWorkerClaimTask("failed"), false);
  });

  it("caps total claims across BullMQ retries and recovery jobs", () => {
    assert.equal(canAttemptTaskExecution(MAX_TASK_EXECUTIONS - 1), true);
    assert.equal(canAttemptTaskExecution(MAX_TASK_EXECUTIONS), false);
  });
});
