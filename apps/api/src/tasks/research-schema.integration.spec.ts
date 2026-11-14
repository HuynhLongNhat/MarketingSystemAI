import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { aiTaskReportCitations, aiTaskResearchRuns, aiTaskResearchSources, aiTasks, db, organization, pool, user } from "@workspace/db/node";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();

function postgresCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: unknown; cause?: unknown };
  return typeof value.code === "string" ? value.code : postgresCode(value.cause);
}

async function expectConstraint(work: () => Promise<unknown>, code: "23503" | "23505") {
  await assert.rejects(work, (error: unknown) => postgresCode(error) === code);
}

before(async () => {
  const identity = await pool.query<{ environment: string }>("select environment from public.environment_identity where id=1");
  if (identity.rows[0]?.environment !== "development") throw new Error("Research schema integration tests require development database");
  await db.insert(organization).values([{ id: organizationId, name: "Research schema fixture", slug: `research-schema-${organizationId}` }, { id: otherOrganizationId, name: "Other research schema fixture", slug: `other-research-schema-${otherOrganizationId}` }]);
  await db.insert(user).values([{ id: userId, name: "Research schema fixture", email: `research-schema-${userId}@example.invalid` }, { id: otherUserId, name: "Other research schema fixture", email: `other-research-schema-${otherUserId}@example.invalid` }]);
});

after(async () => {
  await db.delete(organization).where(eq(organization.id, organizationId));
  await db.delete(organization).where(eq(organization.id, otherOrganizationId));
  await db.delete(user).where(eq(user.id, userId));
  await db.delete(user).where(eq(user.id, otherUserId));
  await pool.end();
});

describe("AI task research schema integration", { concurrency: false }, () => {
  it("defaults tasks safely, enforces tenant-bound sources and citations, and cascades task cleanup", async () => {
    const taskId = randomUUID(), sameOrganizationOtherTaskId = randomUUID(), otherTaskId = randomUUID(), runId = randomUUID(), sameOrganizationOtherRunId = randomUUID(), otherRunId = randomUUID(), sourceId = randomUUID(), otherSourceId = randomUUID();
    await db.insert(aiTasks).values([{ id: taskId, organizationId, createdBy: userId, title: "Task", description: "No research by default" }, { id: sameOrganizationOtherTaskId, organizationId, createdBy: userId, title: "Same tenant Task", description: "Must not share runs" }, { id: otherTaskId, organizationId: otherOrganizationId, createdBy: otherUserId, title: "Other Task", description: "Other tenant" }]);
    const [task] = await db.select().from(aiTasks).where(eq(aiTasks.id, taskId));
    assert.equal(task?.webResearchEnabled, false);

    await db.insert(aiTaskResearchRuns).values([{ id: runId, organizationId, taskId, provider: "tavily", status: "completed", queryCount: 2, requestCount: 3, sourceCount: 2, startedAt: new Date(), completedAt: new Date() }, { id: sameOrganizationOtherRunId, organizationId, taskId: sameOrganizationOtherTaskId, provider: "tavily" }, { id: otherRunId, organizationId: otherOrganizationId, taskId: otherTaskId, provider: "tavily" }]);
    await db.insert(aiTaskResearchSources).values([{ id: sourceId, organizationId, taskId, researchRunId: runId, ordinal: 1, canonicalUrl: "https://example.com/a", displayUrl: "https://example.com/a", title: "A", domain: "example.com", excerpt: "Evidence", status: "retrieved", retrievedAt: new Date() }, { id: otherSourceId, organizationId: otherOrganizationId, taskId: otherTaskId, researchRunId: otherRunId, ordinal: 1, canonicalUrl: "https://example.org/b", displayUrl: "https://example.org/b", title: "B", domain: "example.org", status: "retrieved", retrievedAt: new Date() }]);
    await db.insert(aiTaskReportCitations).values({ id: randomUUID(), organizationId, taskId, sourceId, citationNumber: 1 });

    await expectConstraint(() => db.insert(aiTaskResearchSources).values({ id: randomUUID(), organizationId: otherOrganizationId, taskId, researchRunId: runId, ordinal: 2, canonicalUrl: "https://example.org/mismatch", displayUrl: "https://example.org/mismatch", title: "Mismatch", domain: "example.org" }), "23503");
    await expectConstraint(() => db.insert(aiTaskResearchSources).values({ id: randomUUID(), organizationId, taskId, researchRunId: sameOrganizationOtherRunId, ordinal: 2, canonicalUrl: "https://example.com/same-tenant-mismatch", displayUrl: "https://example.com/same-tenant-mismatch", title: "Same tenant mismatch", domain: "example.com" }), "23503");
    await expectConstraint(() => db.insert(aiTaskResearchSources).values({ id: randomUUID(), organizationId, taskId, researchRunId: runId, ordinal: 1, canonicalUrl: "https://example.com/duplicate", displayUrl: "https://example.com/duplicate", title: "Duplicate", domain: "example.com" }), "23505");
    await expectConstraint(() => db.insert(aiTaskReportCitations).values({ id: randomUUID(), organizationId, taskId, sourceId, citationNumber: 1 }), "23505");
    await expectConstraint(() => db.insert(aiTaskReportCitations).values({ id: randomUUID(), organizationId, taskId, sourceId: otherSourceId, citationNumber: 2 }), "23503");

    await db.delete(aiTasks).where(eq(aiTasks.id, taskId));
    const [runs, sources, citations] = await Promise.all([db.select().from(aiTaskResearchRuns).where(eq(aiTaskResearchRuns.taskId, taskId)), db.select().from(aiTaskResearchSources).where(eq(aiTaskResearchSources.taskId, taskId)), db.select().from(aiTaskReportCitations).where(eq(aiTaskReportCitations.taskId, taskId))]);
    assert.equal(runs.length, 0);
    assert.equal(sources.length, 0);
    assert.equal(citations.length, 0);
  });
});
