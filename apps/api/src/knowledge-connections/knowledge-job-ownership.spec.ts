import assert from "node:assert/strict";
import test from "node:test";

import {
  KNOWLEDGE_JOB_STALE_MS,
  isCurrentJobOwner,
  isFreshKnowledgeJob,
} from "./knowledge-job-ownership.js";

test("a concurrent retry invalidates the old ingestion worker", () => {
  assert.equal(isCurrentJobOwner({
    actualGeneration: 2,
    actualToken: "new-token",
    expectedGeneration: 1,
    expectedToken: "old-token",
  }), false);
});

test("a deleted source cannot be owned by an in-flight worker", () => {
  assert.equal(isCurrentJobOwner({
    actualGeneration: 1,
    actualToken: null,
    expectedGeneration: 1,
    expectedToken: "worker-token",
  }), false);
});

test("a fresh pending job is not re-enqueued", () => {
  const now = Date.now();
  assert.equal(isFreshKnowledgeJob(new Date(now - 1), now), true);
});

test("a stale pending or crashed embedding job can be reclaimed", () => {
  const now = Date.now();
  assert.equal(
    isFreshKnowledgeJob(
      new Date(now - KNOWLEDGE_JOB_STALE_MS - 1),
      now,
    ),
    false,
  );
});
