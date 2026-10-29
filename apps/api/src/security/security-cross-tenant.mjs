
import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = (
  process.env.API_TEST_URL ?? "http://localhost:3002"
).replace(/\/+$/, "");

const origin =
  process.env.API_TEST_ORIGIN ?? "http://localhost:3000";

const apiUrl = new URL(baseUrl);

// Chỉ chạy trên API local, tránh tác động production.
if (
  apiUrl.protocol !== "http:" ||
  !["localhost", "127.0.0.1"].includes(apiUrl.hostname) ||
  apiUrl.port !== "3002"
) {
  throw new Error(
    "Cross-tenant tests require local API on port 3002.",
  );
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
    throw new Error(
      `Missing test configuration for User ${user.label}.`,
    );
  }
}

assert.notEqual(
  users[0].email.toLowerCase(),
  users[1].email.toLowerCase(),
);

assert.notEqual(
  users[0].organizationId,
  users[1].organizationId,
);

// Cookie jar riêng cho mỗi tài khoản.
function createClient() {
  const cookies = new Map();

  async function request(
    path,
    { method = "GET", body } = {},
  ) {
    const cookieHeader = [...cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        origin,
        ...(cookieHeader
          ? { cookie: cookieHeader }
          : {}),
        ...(body === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body) }),
      redirect: "manual",
    });

    // Cập nhật session cookie nếu Better Auth trả cookie mới.
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

// Chỉ đọc response body khi cần thông báo lỗi.
async function describeError(response) {
  const body = await response.text();

  return (
    `${response.status} ${response.statusText}: ` +
    body.slice(0, 350)
  );
}

async function expectStatus(
  response,
  expected,
  context,
) {
  // Không đọc body nếu HTTP status đúng.
  if (response.status !== expected) {
    assert.fail(
      `${context}: expected HTTP ${expected}, ` +
      `received ${await describeError(response)}`,
    );
  }
}

async function getActiveOrganization(client) {
  const response = await client.request(
    "/api/auth/get-session",
  );

  await expectStatus(
    response,
    200,
    "Get Better Auth session",
  );

  const payload = await response.json();

  assert.ok(
    payload?.session,
    "Missing Better Auth session",
  );

  return payload.session.activeOrganizationId ?? null;
}

async function setupClient(user) {
  const client = createClient();

  const signIn = await client.request(
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
    signIn,
    200,
    `Sign in User ${user.label}`,
  );

  const activate = await client.request(
    "/api/auth/organization/set-active",
    {
      method: "POST",
      body: {
        organizationId: user.organizationId,
      },
    },
  );

  await expectStatus(
    activate,
    200,
    `Activate Organization for User ${user.label}`,
  );

  const activeOrg = await getActiveOrganization(client);

  assert.equal(
    activeOrg,
    user.organizationId,
    `Wrong active Organization for User ${user.label}`,
  );

  return client;
}

test(
  "9G.5C: authenticated cross-tenant isolation",
  async (t) => {
    const [userA, userB] = users;

    const [clientA, clientB] = await Promise.all([
      setupClient(userA),
      setupClient(userB),
    ]);

    // TEST 1: User A truy cập Organization A.
    await t.test(
      "A can read only active organization A",
      async () => {
        const response = await clientA.request(
          "/v1/organizations/current",
        );

        await expectStatus(
          response,
          200,
          "Read Organization A",
        );

        const data = await response.json();

        assert.equal(
          data.id,
          userA.organizationId,
        );
      },
    );

    // TEST 2: User B truy cập Organization B.
    await t.test(
      "B can read only active organization B",
      async () => {
        const response = await clientB.request(
          "/v1/organizations/current",
        );

        await expectStatus(
          response,
          200,
          "Read Organization B",
        );

        const data = await response.json();

        assert.equal(
          data.id,
          userB.organizationId,
        );
      },
    );

    // TEST 3: User A không đọc được Widget Settings B.
    await t.test(
      "A cannot read widget settings of B",
      async () => {
        const response = await clientA.request(
          `/v1/widget-settings/${encodeURIComponent(
            userB.organizationId,
          )}`,
        );

        await expectStatus(
          response,
          403,
          "A -> B Widget Settings",
        );
      },
    );

    // TEST 4: User B không đọc được Widget Settings A.
    await t.test(
      "B cannot read widget settings of A",
      async () => {
        const response = await clientB.request(
          `/v1/widget-settings/${encodeURIComponent(
            userA.organizationId,
          )}`,
        );

        await expectStatus(
          response,
          403,
          "B -> A Widget Settings",
        );
      },
    );

    // TEST 5: User A chỉ thấy Members của A.
    // Chạy trước các test cố tình chuyển sai Organization.
    await t.test(
      "A sees only A members",
      async () => {
        const response = await clientA.request(
          "/v1/organizations/current/members",
        );

        await expectStatus(
          response,
          200,
          "List Organization A Members",
        );

        const members = await response.json();

        assert.ok(
          Array.isArray(members),
          "Members response must be an array",
        );

        assert.ok(
          members.some(
            (member) =>
              member.email?.toLowerCase() ===
              userA.email.toLowerCase(),
          ),
          "User A must be a member of Organization A",
        );

        assert.ok(
          !members.some(
            (member) =>
              member.email?.toLowerCase() ===
              userB.email.toLowerCase(),
          ),
          "Organization A must not expose User B",
        );
      },
    );

    // TEST 6: User B chỉ thấy Members của B.
    await t.test(
      "B sees only B members",
      async () => {
        const response = await clientB.request(
          "/v1/organizations/current/members",
        );

        await expectStatus(
          response,
          200,
          "List Organization B Members",
        );

        const members = await response.json();

        assert.ok(
          Array.isArray(members),
          "Members response must be an array",
        );

        assert.ok(
          members.some(
            (member) =>
              member.email?.toLowerCase() ===
              userB.email.toLowerCase(),
          ),
          "User B must be a member of Organization B",
        );

        assert.ok(
          !members.some(
            (member) =>
              member.email?.toLowerCase() ===
              userA.email.toLowerCase(),
          ),
          "Organization B must not expose User A",
        );
      },
    );

    // TEST 7: User A không thể kích hoạt Organization B.
    await t.test(
      "A cannot activate B",
      async () => {
        const response = await clientA.request(
          "/api/auth/organization/set-active",
          {
            method: "POST",
            body: {
              organizationId: userB.organizationId,
            },
          },
        );

        if (
          ![400, 403, 404].includes(response.status)
        ) {
          assert.fail(
            "Expected rejected cross-tenant switch, " +
            `received ${await describeError(response)}`,
          );
        }

        const activeOrg =
          await getActiveOrganization(clientA);

        // Không cho phép kích hoạt Organization B.
        // null được ghi nhận riêng, không xem là truy cập chéo.
        assert.notEqual(
          activeOrg,
          userB.organizationId,
          "Security failure: User A activated Organization B",
        );

        console.log(
          `[User A] Active Organization after rejected switch: ` +
          `${activeOrg ?? "null"}`,
        );
      },
    );

    // TEST 8: User B không thể kích hoạt Organization A.
    await t.test(
      "B cannot activate A",
      async () => {
        const response = await clientB.request(
          "/api/auth/organization/set-active",
          {
            method: "POST",
            body: {
              organizationId: userA.organizationId,
            },
          },
        );

        if (
          ![400, 403, 404].includes(response.status)
        ) {
          assert.fail(
            "Expected rejected cross-tenant switch, " +
            `received ${await describeError(response)}`,
          );
        }

        const activeOrg =
          await getActiveOrganization(clientB);

        assert.notEqual(
          activeOrg,
          userA.organizationId,
          "Security failure: User B activated Organization A",
        );

        console.log(
          `[User B] Active Organization after rejected switch: ` +
          `${activeOrg ?? "null"}`,
        );
      },
    );
  },
);
