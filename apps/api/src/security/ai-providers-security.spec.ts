
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasPermission,
  PERMISSIONS,
} from "../common/permissions/permissions.js";

import {
  encryptCredential,
  decryptCredential,
} from "../ai-credentials/credential-crypto.js";

import { randomBytes } from "node:crypto";

describe("MVP-05.2 - AI Provider RBAC", () => {
  it("owner can read and manage AI providers", () => {
    assert.equal(
      hasPermission("owner", PERMISSIONS.AI_PROVIDER_READ),
      true,
    );
    assert.equal(
      hasPermission("owner", PERMISSIONS.AI_PROVIDER_MANAGE),
      true,
    );
  });

  it("admin can read and manage AI providers", () => {
    assert.equal(
      hasPermission("admin", PERMISSIONS.AI_PROVIDER_READ),
      true,
    );
    assert.equal(
      hasPermission("admin", PERMISSIONS.AI_PROVIDER_MANAGE),
      true,
    );
  });

  it("member cannot read or manage AI providers", () => {
    assert.equal(
      hasPermission("member", PERMISSIONS.AI_PROVIDER_READ),
      false,
    );
    assert.equal(
      hasPermission("member", PERMISSIONS.AI_PROVIDER_MANAGE),
      false,
    );
  });
});

describe("MVP-05.2 - Credential Security", () => {
  const originalKey = process.env.AI_CREDENTIAL_ENCRYPTION_KEY;

  const identity = {
    organizationId: "org-a",
    connectionId: "connection-a",
    provider: "openrouter",
  };

  const apiKey = "sk-test-example-not-real";

  function withTestKey(callback: () => void) {
    process.env.AI_CREDENTIAL_ENCRYPTION_KEY =
      randomBytes(32).toString("base64");

    try {
      callback();
    } finally {
      if (originalKey === undefined) {
        delete process.env.AI_CREDENTIAL_ENCRYPTION_KEY;
      } else {
        process.env.AI_CREDENTIAL_ENCRYPTION_KEY =
          originalKey;
      }
    }
  }

  it("encrypts and decrypts with the correct identity", () => {
    withTestKey(() => {
      const encrypted = encryptCredential(apiKey, identity);

      assert.notEqual(encrypted.encryptedApiKey, apiKey);
      assert.equal(
        decryptCredential(encrypted, identity),
        apiKey,
      );
    });
  });

  it("rejects credentials from another organization", () => {
    withTestKey(() => {
      const encrypted = encryptCredential(apiKey, identity);

      assert.throws(() =>
        decryptCredential(encrypted, {
          ...identity,
          organizationId: "org-b",
        }),
      );
    });
  });

  it("rejects credentials bound to another provider", () => {
    withTestKey(() => {
      const encrypted = encryptCredential(apiKey, identity);

      assert.throws(() =>
        decryptCredential(encrypted, {
          ...identity,
          provider: "anthropic",
        }),
      );
    });
  });
});
