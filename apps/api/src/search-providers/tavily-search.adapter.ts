import { Injectable } from "@nestjs/common";

import {
  type SearchProviderAdapter,
  SearchProviderRuntimeError,
  type SearchRequest,
  type SearchResponse,
} from "./search-provider.adapter.js";

type TavilyResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  raw_content?: unknown;
  score?: unknown;
  published_date?: unknown;
};

type TavilyResponse = { results?: unknown };

@Injectable()
export class TavilySearchAdapter implements SearchProviderAdapter {
  readonly provider = "tavily";

  async search(apiKey: string, request: SearchRequest): Promise<SearchResponse> {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: request.query,
          search_depth: request.searchDepth ?? "basic",
          max_results: request.maxResults ?? 5,
          ...(request.includeDomains?.length ? { include_domains: request.includeDomains } : {}),
          ...(request.excludeDomains?.length ? { exclude_domains: request.excludeDomains } : {}),
          include_answer: false,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });

      if (response.status === 401 || response.status === 403) throw new SearchProviderRuntimeError("SEARCH_PROVIDER_AUTH_FAILED", "Search provider credentials were rejected.");
      if (response.status === 429) throw new SearchProviderRuntimeError("SEARCH_PROVIDER_RATE_LIMITED", "Search provider rate limit reached.");
      if (!response.ok) throw new SearchProviderRuntimeError("SEARCH_PROVIDER_UNAVAILABLE", "Search provider is unavailable.");

      const body = await response.json() as TavilyResponse;
      if (!Array.isArray(body.results)) throw new SearchProviderRuntimeError("SEARCH_PROVIDER_INVALID_RESPONSE", "Search provider returned an invalid response.");

      const results = body.results.flatMap((value): SearchResponse["results"] => {
        if (!value || typeof value !== "object") return [];
        const result = value as TavilyResult;
        if (typeof result.title !== "string" || typeof result.url !== "string") return [];
        const content = typeof result.content === "string" ? result.content : typeof result.raw_content === "string" ? result.raw_content : null;
        return [{
          title: result.title,
          url: result.url,
          snippet: content,
          content,
          score: typeof result.score === "number" ? result.score : null,
          publishedAt: typeof result.published_date === "string" ? result.published_date : null,
          provider: this.provider,
        }];
      });

      return { query: request.query, provider: this.provider, results };
    } catch (error) {
      if (error instanceof SearchProviderRuntimeError) throw error;
      if (error instanceof DOMException && error.name === "TimeoutError") throw new SearchProviderRuntimeError("SEARCH_PROVIDER_TIMEOUT", "Search provider request timed out.");
      throw new SearchProviderRuntimeError("SEARCH_PROVIDER_UNAVAILABLE", "Search provider could not be reached.");
    }
  }
}
