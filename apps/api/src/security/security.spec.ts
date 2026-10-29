
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ForbiddenException } from "@nestjs/common";

import {
  hasPermission,
  PERMISSIONS,
} from "../common/permissions/permissions.js";

import { assertTenantAccess } from "../common/tenant/tenant-access.js";
import type { RequestContext } from "../auth/request-context.js";

const context: RequestContext = {
  userId: "user-a",
  sessionId: "session-a",
  organizationId: "org-a",
  role: "owner",
};

describe("Security - RBAC", () => {
  it("owner can manage billing", () => {
    assert.equal(
      hasPermission("owner", PERMISSIONS.BILLING_MANAGE),
      true,
    );
  });

  it("admin cannot delete organization", () => {
    assert.equal(
      hasPermission("admin", PERMISSIONS.ORGANIZATION_DELETE),
      false,
    );
  });

  it("admin can invite members", () => {
    assert.equal(
      hasPermission("admin", PERMISSIONS.MEMBER_INVITE),
      true,
    );
  });

  it("member cannot invite members", () => {
    assert.equal(
      hasPermission("member", PERMISSIONS.MEMBER_INVITE),
      false,
    );
  });

  it("member can read widget settings", () => {
    assert.equal(
      hasPermission("member", PERMISSIONS.WIDGET_READ),
      true,
    );
  });
});

describe("Security - Tenant Isolation", () => {
  it("allows active organization", () => {
    assert.doesNotThrow(() => {
      assertTenantAccess(context, "org-a");
    });
  });

  it("rejects cross-tenant access", () => {
    assert.throws(
      () => assertTenantAccess(context, "org-b"),
      ForbiddenException,
    );
  });

  it("rejects empty organization ID", () => {
    assert.throws(
      () => assertTenantAccess(context, ""),
      ForbiddenException,
    );
  });
});
