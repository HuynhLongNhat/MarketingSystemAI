import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

// Match Drizzle's local-development convention. Existing shell variables still
// take precedence, so CI can provide CRM_TEST_DATABASE_URL without a file.
config({ path: resolve(process.cwd(), "../../.env.local") });

// Prefer a dedicated test DB. For local development this may reuse DATABASE_URL:
// every fixture stays inside one transaction which is rolled back before exit.
// This script never runs migrations, TRUNCATE, DROP, or cleanup deletes.
const databaseUrl = process.env.CRM_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("SKIP: neither CRM_TEST_DATABASE_URL nor DATABASE_URL is configured.");
  process.exit(0);
}

const client = new Client({ connectionString: databaseUrl });
const suffix = randomUUID();
const ids = {
  organizationA: `crm-test-org-a-${suffix}`,
  organizationB: `crm-test-org-b-${suffix}`,
  userA: `crm-test-user-a-${suffix}`,
  userB: `crm-test-user-b-${suffix}`,
  sessionA: `crm-test-session-a-${suffix}`,
  conversationA: `crm-test-conversation-a-${suffix}`,
  contactA: `crm-test-contact-a-${suffix}`,
  contactB: `crm-test-contact-b-${suffix}`,
};

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
}

async function expectConstraint(name, callback) {
  await client.query("SAVEPOINT crm_constraint_check");
  try {
    await callback();
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT crm_constraint_check");
    assert.ok(
      error && typeof error === "object" && ["23503", "23505"].includes(error.code),
      `${name}: expected PostgreSQL FK/unique violation`,
    );
    record(name, "PASS", `rejected with ${error.code}`);
    return;
  }
  await client.query("ROLLBACK TO SAVEPOINT crm_constraint_check");
  throw new Error(`${name}: expected a database constraint violation`);
}

try {
  await client.connect();
  const tables = await client.query(
    "select to_regclass('public.crm_contacts') as contacts, to_regclass('public.crm_channel_identities') as identities, to_regclass('public.crm_conversation_contacts') as links, to_regclass('public.crm_leads') as leads",
  );
  assert.deepEqual(Object.values(tables.rows[0]), [
    "crm_contacts",
    "crm_channel_identities",
    "crm_conversation_contacts",
    "crm_leads",
  ], "Migration 0027 must be applied to CRM_TEST_DATABASE_URL before running this test");

  await client.query("BEGIN");
  await client.query(
    "insert into organization (id, name, slug) values ($1, $2, $3), ($4, $5, $6)",
    [ids.organizationA, "CRM test organization A", `crm-test-a-${suffix}`, ids.organizationB, "CRM test organization B", `crm-test-b-${suffix}`],
  );
  await client.query(
    "insert into \"user\" (id, name, email, email_verified) values ($1, $2, $3, true), ($4, $5, $6, true)",
    [ids.userA, "CRM test user A", `crm-a-${suffix}@example.test`, ids.userB, "CRM test user B", `crm-b-${suffix}@example.test`],
  );
  await client.query(
    "insert into member (id, organization_id, user_id, role) values ($1, $2, $3, 'member')",
    [`crm-test-member-a-${suffix}`, ids.organizationA, ids.userA],
  );
  await client.query(
    "insert into contact_sessions (id, organization_id, expires_at) values ($1, $2, now() + interval '1 day')",
    [ids.sessionA, ids.organizationA],
  );
  await client.query(
    "insert into conversations (id, organization_id, contact_session_id) values ($1, $2, $3)",
    [ids.conversationA, ids.organizationA, ids.sessionA],
  );
  await client.query(
    "insert into conversation_messages (id, organization_id, conversation_id, role, content) values ($1, $2, $3, 'user', 'customer message must survive contact deletion')",
    [`crm-test-message-${suffix}`, ids.organizationA, ids.conversationA],
  );
  await client.query(
    "insert into crm_contacts (id, organization_id, display_name) values ($1, $2, 'Contact A'), ($3, $4, 'Contact B')",
    [ids.contactA, ids.organizationA, ids.contactB, ids.organizationB],
  );

  await expectConstraint("TEST 01 — contact cannot be used by organization B identity", () =>
    client.query(
      "insert into crm_channel_identities (id, organization_id, contact_id, channel_type, external_user_id) values ($1, $2, $3, 'widget', 'visitor-a')",
      [`crm-test-cross-identity-${suffix}`, ids.organizationB, ids.contactA],
    ));

  await expectConstraint("TEST 02 — conversation A cannot link contact B", () =>
    client.query(
      "insert into crm_conversation_contacts (conversation_id, organization_id, contact_id) values ($1, $2, $3)",
      [ids.conversationA, ids.organizationA, ids.contactB],
    ));

  await client.query(
    "insert into crm_channel_identities (id, organization_id, contact_id, channel_type, channel_connection_id, external_user_id) values ($1, $2, $3, 'widget', 'default', 'same-external-user')",
    [`crm-test-identity-a-${suffix}`, ids.organizationA, ids.contactA],
  );
  await expectConstraint("TEST 03a — identity cannot cross organizations", () =>
    client.query(
      "insert into crm_channel_identities (id, organization_id, contact_id, channel_type, external_user_id) values ($1, $2, $3, 'widget', 'visitor-b')",
      [`crm-test-cross-identity-b-${suffix}`, ids.organizationA, ids.contactB],
    ));
  await expectConstraint("TEST 03b — duplicate channel identity is rejected", () =>
    client.query(
      "insert into crm_channel_identities (id, organization_id, contact_id, channel_type, channel_connection_id, external_user_id) values ($1, $2, $3, 'widget', 'default', 'same-external-user')",
      [`crm-test-identity-duplicate-${suffix}`, ids.organizationA, ids.contactA],
    ));

  await expectConstraint("TEST 04 — lead A cannot reference contact B", () =>
    client.query(
      "insert into crm_leads (id, organization_id, contact_id) values ($1, $2, $3)",
      [`crm-test-cross-lead-${suffix}`, ids.organizationA, ids.contactB],
    ));

  await client.query(
    "insert into crm_conversation_contacts (conversation_id, organization_id, contact_id) values ($1, $2, $3)",
    [ids.conversationA, ids.organizationA, ids.contactA],
  );
  const secondContactId = `crm-test-contact-a-2-${suffix}`;
  await client.query(
    "insert into crm_contacts (id, organization_id, display_name) values ($1, $2, 'Second contact A')",
    [secondContactId, ids.organizationA],
  );
  await expectConstraint("TEST 05 — conversation has one CRM contact", () =>
    client.query(
      "insert into crm_conversation_contacts (conversation_id, organization_id, contact_id) values ($1, $2, $3)",
      [ids.conversationA, ids.organizationA, secondContactId],
    ));

  await client.query("delete from crm_contacts where id = $1 and organization_id = $2", [ids.contactA, ids.organizationA]);
  const preserved = await client.query(
    "select (select count(*) from conversations where id = $1 and organization_id = $2) as conversations, (select count(*) from conversation_messages where conversation_id = $1 and organization_id = $2) as messages, (select count(*) from crm_conversation_contacts where conversation_id = $1 and organization_id = $2) as links",
    [ids.conversationA, ids.organizationA],
  );
  assert.deepEqual(preserved.rows[0], { conversations: "1", messages: "1", links: "0" });
  record("TEST 06 — deleting CRM contact preserves conversation and messages", "PASS", "CRM link cascaded only");

  await client.query(
    "insert into crm_leads (id, organization_id, contact_id, owner_user_id) values ($1, $2, $3, $4)",
    [`crm-test-owner-risk-${suffix}`, ids.organizationA, secondContactId, ids.userB],
  );
  record("TEST 07 — lead owner membership validation", "NOT IMPLEMENTED", "database FK accepts an existing user who is not an organization member; validate membership in future CRM service before insert/update");

  await client.query("ROLLBACK");
  console.table(results);
  console.log(`PASS=${results.filter((item) => item.status === "PASS").length} NOT_IMPLEMENTED=${results.filter((item) => item.status === "NOT IMPLEMENTED").length}`);
} catch (error) {
  try { await client.query("ROLLBACK"); } catch { /* no active transaction */ }
  throw error;
} finally {
  await client.end();
}
