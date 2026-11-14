import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { SearchProviderConnectionTestService } from "./search-provider-connection-test.service.js";

const connection = {
  id: "connection-1", organizationId: "org-1", provider: "tavily" as const, name: "Tavily",
  encryptedApiKey: "encrypted", keyIv: "iv", keyAuthTag: "tag", keyVersion: "v1", enabled: true,
  createdAt: new Date(), updatedAt: new Date(),
};
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe("SearchProviderConnectionTestService", () => {
  it("maps Tavily credential, rate-limit and timeout results without returning the key", async () => {
    const service = new SearchProviderConnectionTestService();
    globalThis.fetch = (async (_url, options) => {
      assert.equal(options?.method, "POST");
      assert.match(String(options?.body), /connection verification/);
      return new Response(null, { status: 401 });
    }) as typeof fetch;
    const invalid = await service.testTavily(connection, "secret-value");
    assert.deepEqual({ status: invalid.status, success: invalid.success, message: invalid.message.includes("secret-value") }, { status: "unauthorized", success: false, message: false });

    globalThis.fetch = (async () => new Response(null, { status: 429 })) as typeof fetch;
    assert.equal((await service.testTavily(connection, "secret-value")).status, "rate_limited");

    globalThis.fetch = (async () => { throw new DOMException("expired", "TimeoutError"); }) as typeof fetch;
    assert.equal((await service.testTavily(connection, "secret-value")).status, "timeout");
  });

  it("does not make a request for disabled connections", async () => {
    let called = false;
    globalThis.fetch = (async () => { called = true; return new Response(); }) as typeof fetch;
    const result = await new SearchProviderConnectionTestService().testTavily({ ...connection, enabled: false }, "secret-value");
    assert.equal(result.status, "disabled");
    assert.equal(called, false);
  });
});
