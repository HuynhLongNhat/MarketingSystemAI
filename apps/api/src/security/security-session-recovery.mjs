
import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = (
  process.env.API_TEST_URL ?? "http://localhost:3002"
).replace(/\/+$/, "");

const origin =
  process.env.API_TEST_ORIGIN ?? "http://localhost:3000";

const apiUrl = new URL(baseUrl);

if (
  apiUrl.protocol !== "http:" ||
  !["localhost", "127.0.0.1"].includes(apiUrl.hostname) ||
  apiUrl.port !== "3002"
) {
  throw new Error("Tests require local API on port 3002");
}

const users = [
  {
    label: "A",
    email: process.env.TEST_USER_A_EMAIL,
    password: process.env.TEST_USER_A_PASSWORD,
    organizationId: process.env.TEST_ORG_A_ID,
  },
  {
    label: "B",
    email: process.env.TEST_USER_B_EMAIL,
    password: process.env.TEST_USER_B_PASSWORD,
    organizationId: process.env.TEST_ORG_B_ID,
  },
];

for (const user of users) {
  if (!user.email || !user.password || !user.organizationId) {
    throw new Error(`Missing configuration for User ${user.label}`);
  }
}

assert.notEqual(users[0].organizationId, users[1].organizationId);
assert.notEqual(users[0].email, users[1].email);

function createClient() {
  const cookies = new Map();

  async function request(path, options = {}) {
    const cookie = [...cookies]
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");

    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        origin,
        ...(cookie ? { cookie } : {}),
        ...(options.body !== undefined
          ? { "content-type": "application/json" }
          : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
      redirect: "manual",
    });

    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(";", 1)[0];
      const separator = pair.indexOf("=");

      if (separator <= 0) continue;

      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);

      if (value) {
        cookies.set(name, value);
      } else {
        cookies.delete(name);
      }
    }

    return response;
  }

  return { request };
}

async function expectStatus(response, status, label) {
  if (response.status !== status) {
    const body = await response.text();

    assert.fail(
      `${label}: expected ${status}, got ${response.status}. ` +
      body.slice(0, 500),
    );
  }
}

async function getSession(client) {
  const response = await client.request("/api/auth/get-session");

  await expectStatus(response, 200, "Get session");

  const payload = await response.json();

  assert.ok(payload?.session, "Session missing");

  return payload.session;
}

async function setActive(client, organizationId) {
  return client.request("/api/auth/organization/set-active", {
    method: "POST",
    body: { organizationId },
  });
}

async function signIn(client, user) {
  const response = await client.request(
    "/api/auth/sign-in/email",
    {
      method: "POST",
      body: {
        email: user.email,
        password: user.password,
      },
    },
  );

  await expectStatus(
    response,
    200,
    `Sign in User ${user.label}`,
  );
}

async function verifyCurrentOrganization(client, organizationId) {
  const response = await client.request(
    "/v1/organizations/current",
  );

  await expectStatus(response, 200, "Current organization");

  const body = await response.json();

  assert.equal(body.id, organizationId);
}

async function runRecoveryTest(t, user, otherOrganizationId) {
  // Session riêng cho mỗi kịch bản.
  const client = createClient();

  await t.test("Login and activate own organization", async () => {
    await signIn(client, user);

    const response = await setActive(client, user.organizationId);

    await expectStatus(
      response,
      200,
      `Activate Organization ${user.label}`,
    );

    const session = await getSession(client);

    assert.equal(
      session.activeOrganizationId,
      user.organizationId,
    );

    await verifyCurrentOrganization(
      client,
      user.organizationId,
    );
  });

  await t.test("Reject unauthorized organization switch", async () => {
    const response = await setActive(
      client,
      otherOrganizationId,
    );

    assert.ok(
      [400, 403, 404].includes(response.status),
      `Unauthorized switch returned HTTP ${response.status}`,
    );

    const session = await getSession(client);

    assert.notEqual(
      session.activeOrganizationId,
      otherOrganizationId,
      "Security failure: unauthorized organization activated",
    );

    console.log(
      `[User ${user.label}] Active after rejection: ` +
      `${session.activeOrganizationId ?? "null"}`,
    );
  });

  await t.test("Recover own organization without login", async () => {
    // Không đăng nhập lại. Sử dụng session hiện tại.
    const response = await setActive(
      client,
      user.organizationId,
    );

    await expectStatus(
      response,
      200,
      `Recover Organization ${user.label}`,
    );

    const session = await getSession(client);

    assert.equal(
      session.activeOrganizationId,
      user.organizationId,
      "Recovery failed: wrong active organization",
    );

    await verifyCurrentOrganization(
      client,
      user.organizationId,
    );
  });

  await t.test("Members endpoint works after recovery", async () => {
    const response = await client.request(
      "/v1/organizations/current/members",
    );

    await expectStatus(
      response,
      200,
      `Members after recovery for User ${user.label}`,
    );

    const members = await response.json();

    assert.ok(
      Array.isArray(members),
      "Expected members array",
    );

    assert.ok(
      members.some(
        (member) =>
          member.email?.toLowerCase() ===
          user.email.toLowerCase(),
      ),
      `User ${user.label} missing from own organization`,
    );
  });
}

test("9G.5D.1: Session Recovery", async (t) => {
  await t.test("User A recovery", async (subtest) => {
    await runRecoveryTest(
      subtest,
      users[0],
      users[1].organizationId,
    );
  });

  await t.test("User B recovery", async (subtest) => {
    await runRecoveryTest(
      subtest,
      users[1],
      users[0].organizationId,
    );
  });
});
