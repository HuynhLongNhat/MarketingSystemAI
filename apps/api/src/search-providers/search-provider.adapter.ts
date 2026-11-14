export type SearchDepth = "basic" | "advanced";

export interface SearchRequest {
  query: string;
  searchDepth?: SearchDepth;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string | null;
  content: string | null;
  score: number | null;
  publishedAt: string | null;
  provider: string;
}

export interface SearchResponse {
  query: string;
  provider: string;
  results: SearchResult[];
}

export interface SearchProviderAdapter {
  readonly provider: string;
  search(apiKey: string, request: SearchRequest): Promise<SearchResponse>;
}

export type SearchProviderErrorCode =
  | "SEARCH_PROVIDER_AUTH_FAILED"
  | "SEARCH_PROVIDER_RATE_LIMITED"
  | "SEARCH_PROVIDER_TIMEOUT"
  | "SEARCH_PROVIDER_UNAVAILABLE"
  | "SEARCH_PROVIDER_UNSUPPORTED"
  | "SEARCH_PROVIDER_INVALID_RESPONSE";

export class SearchProviderRuntimeError extends Error {
  constructor(readonly code: SearchProviderErrorCode, message: string) {
    super(message);
    this.name = "SearchProviderRuntimeError";
  }
}
