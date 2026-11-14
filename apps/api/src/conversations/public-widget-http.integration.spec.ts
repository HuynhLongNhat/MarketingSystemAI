import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, organization, pool, widgetSettings } from "@workspace/db/node";

const baseUrl = process.env.API_TEST_URL ?? "http://localhost:3002";
const origin = "https://widget-http-test.example";
const organizationId = randomUUID();

async function request(path: string, options: RequestInit = {}) {
  return fetch(`${baseUrl}/v1/public/widget${path}`, { ...options, headers: { Origin: origin, ...(options.headers ?? {}) }, signal: AbortSignal.timeout(5_000) });
}
before(async () => {
  const identity = await pool.query<{ environment: string }>("select environment from public.environment_identity where id=1");
  if (identity.rows[0]?.environment !== "development") throw new Error("Widget HTTP integration tests require development database");
  await db.insert(organization).values({ id: organizationId, name: "Widget HTTP fixture", slug: `widget-http-${organizationId}` });
  await db.insert(widgetSettings).values({ organizationId, greetMessage: "Hello", defaultSuggestions: {}, allowedOrigins: [origin] });
});
after(async () => { await db.delete(organization).where(eq(organization.id, organizationId)); await pool.end(); });

describe("Public widget HTTP authorization", { concurrency: false }, () => {
  it("enforces origin and session-bound conversation ownership", async () => {
    const create = async () => {
      const response = await request("/guest-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId }) });
      assert.equal(response.status, 201);
      return response.json() as Promise<{ token: string }>;
    };
    const a = await create();
    const b = await create();
    const created = await request("/conversations", { method: "POST", headers: { Authorization: `Bearer ${a.token}` } });
    assert.equal(created.status, 201);
    const conversation = await created.json() as { id: string };
    const readOther = await request(`/conversations/${conversation.id}`, { headers: { Authorization: `Bearer ${b.token}` } });
    assert.equal(readOther.status, 404);
    const writeOther = await request(`/conversations/${conversation.id}/messages`, { method: "POST", headers: { Authorization: `Bearer ${b.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ content: "not allowed", clientMessageId: randomUUID() }) });
    assert.equal(writeOther.status, 404);
    const forbiddenOrigin = await fetch(`${baseUrl}/v1/public/widget/conversations`, { method: "POST", headers: { Origin: "https://attacker.example", Authorization: `Bearer ${a.token}` }, signal: AbortSignal.timeout(5_000) });
    assert.equal(forbiddenOrigin.status, 403);
  });
});
