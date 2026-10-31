
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import {
  encryptCredential,
  decryptCredential,
} from "../dist/ai-credentials/credential-crypto.js";

// Use a temporary test key, never a real production secret.
process.env.AI_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const TEST_API_KEY = "sk-test-example-not-a-real-key";

const identity = {
  organizationId: "org-test-001",
  connectionId: "connection-test-001",
  provider: "openrouter",
};

let passed = 0;

function test(name, callback) {
  try {
    callback();
    passed += 1;
    console.log(`PASS ${passed}/7 - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const encrypted = encryptCredential(TEST_API_KEY, identity);

// TEST 1: Encryption must not expose plaintext.
test("API key is encrypted", () => {
  assert.notEqual(encrypted.encryptedApiKey, TEST_API_KEY);
  assert.equal(encrypted.keyVersion, "v1");
  assert.ok(encrypted.encryptedApiKey.length > 0);
});

// TEST 2: Correct identity can decrypt.
test("Correct identity can decrypt", () => {
  const decrypted = decryptCredential(encrypted, identity);
  assert.equal(decrypted, TEST_API_KEY);
});

// TEST 3: Different organization cannot decrypt.
test("Different organization is rejected", () => {
  assert.throws(() =>
    decryptCredential(encrypted, {
      ...identity,
      organizationId: "org-other",
    }),
  );
});

// TEST 4: Different connection cannot decrypt.
test("Different connection is rejected", () => {
  assert.throws(() =>
    decryptCredential(encrypted, {
      ...identity,
      connectionId: "connection-other",
    }),
  );
});

// TEST 5: Different provider cannot decrypt.
test("Different provider is rejected", () => {
  assert.throws(() =>
    decryptCredential(encrypted, {
      ...identity,
      provider: "openai",
    }),
  );
});

// TEST 6: Modified ciphertext must be rejected.
test("Tampered ciphertext is rejected", () => {
  const bytes = Buffer.from(encrypted.encryptedApiKey, "base64");
  bytes[0] ^= 1;

  const tampered = {
    ...encrypted,
    encryptedApiKey: bytes.toString("base64"),
  };

  assert.throws(() => decryptCredential(tampered, identity));
});

// TEST 7: Repeated encryption must use different IVs.
test("Each encryption uses a unique IV", () => {
  const encryptedAgain = encryptCredential(TEST_API_KEY, identity);

  assert.notEqual(encrypted.keyIv, encryptedAgain.keyIv);
  assert.notEqual(
    encrypted.encryptedApiKey,
    encryptedAgain.encryptedApiKey,
  );

  assert.equal(
    decryptCredential(encryptedAgain, identity),
    TEST_API_KEY,
  );
});

console.log("");

if (passed === 7) {
  console.log("Credential crypto: 7/7 PASS");
} else {
  console.error(`Credential crypto: ${passed}/7 PASS`);
  process.exitCode = 1;
}
