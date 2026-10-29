
import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.API_TEST_URL ?? "http://127.0.0.1:3002";

const userA = {
  email: process.env.TEST_USER_A_EMAIL,
  password: process.env.TEST_USER_A_PASSWORD,
  organizationId: process.env.TEST_ORG_A_ID,
};

const userB = {
  email: process.env.TEST_USER_B_EMAIL,
  password: process.env.TEST_USER_B_PASSWORD,
  organizationId: process.env.TEST_ORG_B_ID,
};

// Chỉ cho phép chạy với API local.
const url = new URL(baseUrl);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "3002"
) {
  throw new Error("Integration tests require local development API on port 3002");
}

for (const [name, user] of Object.entries({ userA, userB })) {
  if (!user.email || !user.password || !user.organizationId) {
    throw new Error(`Missing test configuration for ${name}`);
  }
}

assert.notEqual(userA.email, userB.email);
assert.notEqual(userA.organizationId, userB.organizationId);

async function request(path, cookie, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(cookie ? { cookie } : {}),
      "content-type": "application/json",
      ...options.headers,
    },
  });
}

async function login(user) {
  const response = await request("/api/auth/sign-in/email", null, {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  assert.equal(response.status, 200, "Test account login failed");

  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.length > 0, "No session cookie returned");

  return cookies.map((c) => c.split(";")[0]).join("; ");
}

async function activateOrganization(cookie, organizationId) {
  const response = await request("/api/auth/organization/set-active", cookie, {
    method: "POST",
    body: JSON.stringify({ organizationId }),
  });

  assert.equal(response.status, 200, "Cannot activate organization");
}

const cookieA = await login(userA);
const cookieB = await login(userB);

await activateOrganization(cookieA, userA.organizationId);
await activateOrganization(cookieB, userB.organizationId);

test("Cross-Tenant HTTP Security", async (t) => {
  await t.test("User A can access Organization A", async () => {
    const res = await request("/v1/organizations/current", cookieA);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, userA.organizationId);
  });

  await t.test("User B can access Organization B", async () => {
    const res = await request("/v1/organizations/current", cookieB);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, userB.organizationId);
  });

  await t.test("User A cannot access Organization B legacy endpoint", async () => {
    const res = await request(
      `/v1/widget-settings/${encodeURIComponent(userB.organizationId)}`,
      cookieA,
    );
    assert.equal(res.status, 403);
  });

  await t.test("User B cannot access Organization A legacy endpoint", async () => {
    const res = await request(
      `/v1/widget-settings/${encodeURIComponent(userA.organizationId)}`,
      cookieB,
    );
    assert.equal(res.status, 403);
  });

  await t.test("User A cannot activate Organization B", async () => {
    const res = await request(
      "/api/auth/organization/set-active",
      cookieA,
      {
        method: "POST",
        body: JSON.stringify({
          organizationId: userB.organizationId,
        }),
      },
    );

    assert.ok(
      [400, 403, 404].includes(res.status),
      `Expected rejection, received ${res.status}`,
    );
  });

  await t.test("User B cannot activate Organization A", async () => {
    const res = await request(
      "/api/auth/organization/set-active",
      cookieB,
      {
        method: "POST",
        body: JSON.stringify({
          organizationId: userA.organizationId,
        }),
      },
    );

    assert.ok(
      [400, 403, 404].includes(res.status),
      `Expected rejection, received ${res.status}`,
    );
  });
});
