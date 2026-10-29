
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { and, eq, ne } from "drizzle-orm";
import { db, member, organization } from "@workspace/db/node";
import { UnrecoverableError } from "bullmq";

import { TenantJobAuthorization } from "../jobs/tenant-job-authorization.js";

const authorization = new TenantJobAuthorization();

async function findTestTenants() {
  const memberships = await db
    .select({
      userId: member.userId,
      organizationId: member.organizationId,
    })
    .from(member)
    .innerJoin(
      organization,
      eq(member.organizationId, organization.id),
    );

  for (const a of memberships) {
    for (const b of memberships) {
      if (
        a.userId === b.userId ||
        a.organizationId === b.organizationId
      ) {
        continue;
      }

      const aInB = memberships.some(
        (m) =>
          m.userId === a.userId &&
          m.organizationId === b.organizationId,
      );

      const bInA = memberships.some(
        (m) =>
          m.userId === b.userId &&
          m.organizationId === a.organizationId,
      );

      if (!aInB && !bInA) {
        return { a, b };
      }
    }
  }

  throw new Error(
    "Need two organizations with isolated test members",
  );
}

describe("9G.8C - Tenant Job Authorization", () => {
  it("validates membership and tenant isolation", async (t) => {
    const { a, b } = await findTestTenants();

    await t.test("A can execute Org A job", async () => {
      const role = await authorization.authorize(
        a.organizationId,
        a.userId,
      );

      assert.ok(["owner", "admin", "member"].includes(role));
    });

    await t.test("B can execute Org B job", async () => {
      const role = await authorization.authorize(
        b.organizationId,
        b.userId,
      );

      assert.ok(["owner", "admin", "member"].includes(role));
    });

    await t.test("A cannot execute Org B job", async () => {
      await assert.rejects(
        authorization.authorize(
          b.organizationId,
          a.userId,
        ),
        UnrecoverableError,
      );
    });

    await t.test("B cannot execute Org A job", async () => {
      await assert.rejects(
        authorization.authorize(
          a.organizationId,
          b.userId,
        ),
        UnrecoverableError,
      );
    });

    await t.test("Unknown user is rejected", async () => {
      await assert.rejects(
        authorization.authorize(
          a.organizationId,
          "non-existent-test-user",
        ),
        UnrecoverableError,
      );
    });

    await t.test("Empty tenant is rejected", async () => {
      await assert.rejects(
        authorization.authorize("", ""),
        UnrecoverableError,
      );
    });
  });
});
