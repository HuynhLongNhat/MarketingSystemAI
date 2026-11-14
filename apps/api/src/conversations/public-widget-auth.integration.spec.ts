import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, contactSessions, organization, pool, widgetSettings } from "@workspace/db/node";
import { PublicWidgetService } from "./public-widget.service.js";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const service = new PublicWidgetService({} as never, { enqueueCustomerSupportReply: async () => ({ jobId: "test" }) } as never, { clearAiTyping: async () => undefined, setAiTyping: async () => undefined, getStatus: async () => ({ kind: "none" }) } as never);

before(async () => {
  const identity = await pool.query<{ environment: string }>("select environment from public.environment_identity where id=1");
  if (identity.rows[0]?.environment !== "development") throw new Error("Widget integration tests require development database");
  await db.insert(organization).values([{ id: organizationId, name: "Widget auth fixture", slug: `widget-auth-${organizationId}` }, { id: otherOrganizationId, name: "Other widget fixture", slug: `other-widget-${otherOrganizationId}` }]);
  await db.insert(widgetSettings).values([{ organizationId, greetMessage: "Hello", defaultSuggestions: {}, allowedOrigins: ["https://widget-test.example"] }, { organizationId: otherOrganizationId, greetMessage: "Hello", defaultSuggestions: {}, allowedOrigins: ["https://widget-test.example"] }]);
});
after(async () => { await db.delete(organization).where(eq(organization.id, organizationId)); await db.delete(organization).where(eq(organization.id, otherOrganizationId)); await pool.end(); });

describe("Public widget guest authentication", { concurrency: false }, () => {
  it("creates a high-entropy bearer, stores only its hash, and validates only active sessions", async () => {
    const guest = await service.createGuestSession({ organizationId });
    assert.match(guest.token, /^[a-f0-9]{64}$/);
    const [stored] = await db.select().from(contactSessions).where(eq(contactSessions.id, guest.contactSessionId));
    assert.ok(stored && stored.sessionTokenHash !== guest.token);
    assert.equal((await service.validateSession(guest.token)).contactSessionId, guest.contactSessionId);
    await assert.rejects(() => service.validateSession("f".repeat(64)));
    await db.update(contactSessions).set({ expiresAt: new Date(Date.now() - 1_000) }).where(eq(contactSessions.id, guest.contactSessionId));
    await assert.rejects(() => service.validateSession(guest.token));
  });

  it("revokes a token and prevents guest-to-guest and cross-organization IDOR", async () => {
    const a = await service.createGuestSession({ organizationId });
    const b = await service.createGuestSession({ organizationId });
    const other = await service.createGuestSession({ organizationId: otherOrganizationId });
    const aConversation = await service.createConversation(a.token);
    const otherConversation = await service.createConversation(other.token);
    await assert.rejects(() => service.getConversation(b.token, aConversation.id));
    await assert.rejects(() => service.listMessages(b.token, aConversation.id));
    await assert.rejects(() => service.sendMessage(b.token, aConversation.id, "unauthorized", randomUUID()));
    await assert.rejects(() => service.getConversation(a.token, otherConversation.id));
    assert.deepEqual(await service.revokeSession(a.token), { revoked: true });
    await assert.rejects(() => service.createConversation(a.token));
  });
});
