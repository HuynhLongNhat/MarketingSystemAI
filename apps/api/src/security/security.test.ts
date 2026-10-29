
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ForbiddenException } from "@nestjs/common";

import {
  hasPermission,
  PERMISSIONS,
} from "../common/permissions/permissions.js";

import { assertTenantAccess } from "../common/tenant/tenant-access.js";

import type { RequestContext } from "../auth/request-context.js";

const ownerContext: RequestContext = {
  userId: "user-a",
  sessionId: "session-a",
  organizationId: "org-a",
  role: "owner",
};

describe("Task 9G - Security", () => {
  describe("Role permissions", () => {
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

    it("member cannot invite users", () => {
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

  describe("Tenant isolation", () => {
    it("allows current organization", () => {
      assert.doesNotThrow(() =>
        assertTenantAccess(ownerContext, "org-a"),
      );
    });

    it("rejects another organization", () => {
      assert.throws(
        () => assertTenantAccess(ownerContext, "org-b"),
        ForbiddenException,
      );
    });

    it("rejects empty organization ID", () => {
      assert.throws(
        () => assertTenantAccess(ownerContext, ""),
        ForbiddenException,
      );
    });
  });
});
