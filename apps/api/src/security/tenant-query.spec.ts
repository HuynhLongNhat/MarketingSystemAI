
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";

import { member } from "@workspace/db/node";
import type { RequestContext } from "../auth/request-context.js";
import { tenantWhere } from "../common/tenant/tenant-query.js";

const context: RequestContext = {
  userId: "user-a",
  sessionId: "session-a",
  organizationId: "org-a",
  role: "owner",
};

describe("9G.7 - Tenant Query", () => {
  it("creates a tenant-scoped SQL condition", () => {
    const condition = tenantWhere(
      context,
      member.organizationId,
    );

    assert.ok(condition);
  });

  it("supports additional AND conditions", () => {
    const condition = tenantWhere(
      context,
      member.organizationId,
      eq(member.userId, "user-a"),
    );

    const query = sql`${condition}`;

    assert.ok(query);
  });

  it("rejects missing active organization", () => {
    const invalidContext = {
      ...context,
      organizationId: "",
    };

    assert.throws(
      () =>
        tenantWhere(
          invalidContext,
          member.organizationId,
        ),
      ForbiddenException,
    );
  });
});
