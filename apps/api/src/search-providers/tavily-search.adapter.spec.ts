import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { SearchProviderRuntimeError } from "./search-provider.adapter.js";
import { TavilySearchAdapter } from "./tavily-search.adapter.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe("TavilySearchAdapter", () => {
  it("normalizes Tavily results without exposing API credentials", async () => {
    globalThis.fetch = (async (_url, options) => {
      assert.match(String(options?.body), /"search_depth":"advanced"/);
      return new Response(JSON.stringify({ results: [{ title: "Example", url: "https://example.com/a", content: "Snippet", score: 0.91, published_date: "2026-01-02" }] }), { status: 200 });
    }) as typeof fetch;
    const result = await new TavilySearchAdapter().search("secret-key", { query: "AI trends", searchDepth: "advanced", maxResults: 3 });
    assert.deepEqual(result, { query: "AI trends", provider: "tavily", results: [{ title: "Example", url: "https://example.com/a", snippet: "Snippet", content: "Snippet", score: 0.91, publishedAt: "2026-01-02", provider: "tavily" }] });
    assert.equal(JSON.stringify(result).includes("secret-key"), false);
  });
  it("maps provider failures to safe runtime error codes", async () => {
    globalThis.fetch = (async () => new Response(null, { status: 429 })) as typeof fetch;
    await assert.rejects(() => new TavilySearchAdapter().search("secret-key", { query: "AI" }), (error: unknown) => error instanceof SearchProviderRuntimeError && error.code === "SEARCH_PROVIDER_RATE_LIMITED");
  });
});
