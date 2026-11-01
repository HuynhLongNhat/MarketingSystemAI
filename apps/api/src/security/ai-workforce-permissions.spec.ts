
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hasPermission,
  PERMISSIONS,
} from "../common/permissions/permissions.js";

test("Owner can manage departments and AI agents", () => {
  assert.equal(
    hasPermission("owner", PERMISSIONS.DEPARTMENT_READ),
    true,
  );

  assert.equal(
    hasPermission("owner", PERMISSIONS.DEPARTMENT_MANAGE),
    true,
  );

  assert.equal(
    hasPermission("owner", PERMISSIONS.AGENT_READ),
    true,
  );

  assert.equal(
    hasPermission("owner", PERMISSIONS.AGENT_MANAGE),
    true,
  );
});

test("Admin can manage departments and AI agents", () => {
  assert.equal(
    hasPermission("admin", PERMISSIONS.DEPARTMENT_READ),
    true,
  );

  assert.equal(
    hasPermission("admin", PERMISSIONS.DEPARTMENT_MANAGE),
    true,
  );

  assert.equal(
    hasPermission("admin", PERMISSIONS.AGENT_READ),
    true,
  );

  assert.equal(
    hasPermission("admin", PERMISSIONS.AGENT_MANAGE),
    true,
  );
});

test("Member can only read departments and AI agents", () => {
  assert.equal(
    hasPermission("member", PERMISSIONS.DEPARTMENT_READ),
    true,
  );

  assert.equal(
    hasPermission("member", PERMISSIONS.AGENT_READ),
    true,
  );

  assert.equal(
    hasPermission("member", PERMISSIONS.DEPARTMENT_MANAGE),
    false,
  );

  assert.equal(
    hasPermission("member", PERMISSIONS.AGENT_MANAGE),
    false,
  );
});

test("Member cannot manage AI provider connections", () => {
  assert.equal(
    hasPermission("member", PERMISSIONS.AI_PROVIDER_MANAGE),
    false,
  );
});
