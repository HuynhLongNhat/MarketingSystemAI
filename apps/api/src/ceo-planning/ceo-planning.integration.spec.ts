import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { aiAgents, aiTasks, ceoPlans, db, organization, pool, user } from "@workspace/db/node";
import { CeoPlanningService } from "./ceo-planning.service.js";

const organizationId = randomUUID();
const userId = randomUUID();
const otherOrganizationId = randomUUID();
const context = { organizationId, userId, role: "owner" } as never;

async function seedTask(status: "queued" | "failed" = "failed") {
  const id = randomUUID();
  await db.insert(aiTasks).values({ id, organizationId, createdBy: userId, title: "Kế hoạch CEO: fixture", description: "fixture", status, completedAt: status === "failed" ? new Date() : null });
  return id;
}

async function seedAgent() {
  const id = randomUUID();
  await db.insert(aiAgents).values({ id, organizationId, name: "CEO fixture", role: "CEO", status: "active", systemPrompt: "fixture" });
  return id;
}

before(async () => {
  const identity = await pool.query<{ environment: string }>("select environment from public.environment_identity where id=1");
  if (identity.rows[0]?.environment !== "development") throw new Error("CEO planning integration tests require development database");
  await db.insert(organization).values([{ id: organizationId, name: "CEO plan fixture", slug: `ceo-plan-${organizationId}` }, { id: otherOrganizationId, name: "Other CEO plan fixture", slug: `other-ceo-plan-${otherOrganizationId}` }]);
  await db.insert(user).values({ id: userId, name: "CEO plan fixture", email: `ceo-plan-${userId}@example.invalid` });
});

after(async () => {
  await db.delete(organization).where(eq(organization.id, organizationId));
  await db.delete(organization).where(eq(organization.id, otherOrganizationId));
  await db.delete(user).where(eq(user.id, userId));
  await pool.end();
});

test("CEO retry is atomic, bounded, and retains the failed plan", async () => {
  const taskId = await seedTask();
  const agentId = await seedAgent();
  const planId = randomUUID();
  await db.insert(ceoPlans).values({ id: planId, organizationId, createdBy: userId, ceoAgentId: agentId, taskId, title: "fixture", objective: "objective" });
  const tasks = { create: async () => ({ id: await seedTask("queued") }) };
  const service = new CeoPlanningService(tasks as never);
  const [first, second] = await Promise.allSettled([service.retry(context, planId), service.retry(context, planId)]);
  assert.equal([first, second].filter((result) => result.status === "fulfilled").length, 1);
  const [original] = await db.select().from(ceoPlans).where(and(eq(ceoPlans.id, planId), eq(ceoPlans.organizationId, organizationId)));
  assert.ok(original?.retryPlanId);
  assert.equal(original?.retryCount, 0);
  const [retry] = await db.select().from(ceoPlans).where(eq(ceoPlans.id, original!.retryPlanId!));
  assert.equal(retry?.retryOfPlanId, planId);
  assert.equal(retry?.retryCount, 1);
});

test("CEO delete is organization-scoped, soft, and rejects a running task", async () => {
  const taskId = await seedTask("queued");
  const agentId = await seedAgent();
  const planId = randomUUID();
  await db.insert(ceoPlans).values({ id: planId, organizationId, createdBy: userId, ceoAgentId: agentId, taskId, title: "delete fixture", objective: "objective" });
  const service = new CeoPlanningService({} as never);
  await assert.rejects(() => service.remove({ organizationId: otherOrganizationId, userId, role: "owner" } as never, planId), /Không tìm thấy/);
  await assert.rejects(() => service.remove(context, planId), /đang được CEO xử lý/);
  await db.update(aiTasks).set({ status: "failed", completedAt: new Date() }).where(eq(aiTasks.id, taskId));
  await service.remove(context, planId);
  await assert.rejects(() => service.get(context, planId), /Không tìm thấy/);
  const [deleted] = await db.select().from(ceoPlans).where(eq(ceoPlans.id, planId));
  assert.ok(deleted?.deletedAt);
});
