import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canWorkerClaimTask } from "./task-execution-state.js";

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
});
