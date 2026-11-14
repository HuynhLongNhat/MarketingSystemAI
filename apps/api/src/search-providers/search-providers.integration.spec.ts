import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { aiAgents, db, organization, pool, searchProviderConnections, user } from "@workspace/db/node";
import { NotFoundException } from "@nestjs/common";
import type { RequestContext } from "../auth/request-context.js";
import { SearchProvidersService } from "./search-providers.service.js";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();
const context: RequestContext = { organizationId, userId, sessionId: randomUUID(), role: "owner" };
const otherContext: RequestContext = { organizationId: otherOrganizationId, userId: otherUserId, sessionId: randomUUID(), role: "owner" };
const service = new SearchProvidersService({ testTavily: async () => ({ connectionId: "", provider: "tavily", status: "connected", success: true, message: "ok", checkedAt: new Date().toISOString() }) } as never);

before(async () => {
  const identity = await pool.query<{ environment: string }>("select environment from public.environment_identity where id=1");
  if (identity.rows[0]?.environment !== "development") throw new Error("Search Provider integration tests require development database");
  await db.insert(organization).values([{ id: organizationId, name: "Search Provider Fixture", slug: `search-provider-${organizationId}` }, { id: otherOrganizationId, name: "Other Search Provider Fixture", slug: `other-search-provider-${otherOrganizationId}` }]);
  await db.insert(user).values([{ id: userId, name: "Search Provider Fixture", email: `search-provider-${userId}@example.invalid` }, { id: otherUserId, name: "Other Search Provider Fixture", email: `search-provider-${otherUserId}@example.invalid` }]);
});
after(async () => { await db.delete(organization).where(eq(organization.id, organizationId)); await db.delete(organization).where(eq(organization.id, otherOrganizationId)); await db.delete(user).where(eq(user.id, userId)); await db.delete(user).where(eq(user.id, otherUserId)); await pool.end(); });

describe("Search Providers integration", { concurrency: false }, () => {
  it("encrypts and rotates credentials, returns safe metadata, and enforces tenant ownership", async () => {
    const created = await service.createConnection(context, { provider: "tavily", name: "Primary", apiKey: "integration-secret-one" });
    assert.equal(created.hasApiKey, true);
    assert.equal(JSON.stringify(created).includes("integration-secret-one"), false);
    const [storedBefore] = await db.select().from(searchProviderConnections).where(eq(searchProviderConnections.id, created.id));
    assert.ok(storedBefore && storedBefore.encryptedApiKey !== "integration-secret-one");
    await service.updateConnection(context, created.id, { apiKey: "integration-secret-two" });
    const [storedAfter] = await db.select().from(searchProviderConnections).where(eq(searchProviderConnections.id, created.id));
    assert.notEqual(storedBefore?.encryptedApiKey, storedAfter?.encryptedApiKey);
    await assert.rejects(() => service.getConnection(otherContext, created.id), NotFoundException);
    assert.equal((await service.listConnections(otherContext)).length, 0);
    await service.deleteConnection(context, created.id);
    assert.equal((await service.listConnections(context)).length, 0);
  });

  it("requires active server-authorized agents and deterministic provider selection", async () => {
    const agentId = randomUUID();
    await db.insert(aiAgents).values({ id: agentId, organizationId, name: "Researcher", role: "research", status: "active", systemPrompt: "test", toolConfig: { enabledTools: ["web_research"] } });
    const first = await service.createConnection(context, { provider: "tavily", name: "First", apiKey: "first-secret" });
    assert.equal((await service.requireResearchPolicy(context, agentId)).id, first.id);
    const second = await service.createConnection(context, { provider: "tavily", name: "Second", apiKey: "second-secret" });
    await assert.rejects(() => service.requireResearchPolicy(context, agentId), (error: unknown) => (error as { response?: { code?: string } }).response?.code === "SEARCH_PROVIDER_SELECTION_REQUIRED");
    assert.equal((await service.requireResearchPolicy(context, agentId, second.id)).id, second.id);
    await service.updateConnection(context, second.id, { enabled: false });
    await assert.rejects(() => service.requireResearchPolicy(context, agentId, second.id), (error: unknown) => (error as { response?: { code?: string } }).response?.code === "SEARCH_PROVIDER_DISABLED");
    await db.update(aiAgents).set({ status: "paused" }).where(eq(aiAgents.id, agentId));
    await assert.rejects(() => service.requireResearchPolicy(context, agentId, first.id), (error: unknown) => (error as { response?: { code?: string } }).response?.code === "AGENT_NOT_ACTIVE");
  });
});
