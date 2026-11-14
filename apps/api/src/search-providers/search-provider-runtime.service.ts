import { BadRequestException, Injectable } from "@nestjs/common";

import type { RequestContext } from "../auth/request-context.js";
import { decryptCredential } from "../ai-credentials/credential-crypto.js";
import { SearchProvidersService } from "./search-providers.service.js";
import {
  type SearchProviderAdapter,
  SearchProviderRuntimeError,
  type SearchRequest,
  type SearchResponse,
} from "./search-provider.adapter.js";
import { TavilySearchAdapter } from "./tavily-search.adapter.js";

export type ResearchSearchInput = {
  agentId: string;
  connectionId?: string;
  request: SearchRequest;
};

@Injectable()
export class SearchProviderRuntimeService {
  private readonly adapters: Map<string, SearchProviderAdapter>;

  constructor(
    private readonly policy: SearchProvidersService,
    tavily: TavilySearchAdapter,
  ) {
    this.adapters = new Map([[tavily.provider, tavily]]);
  }

  private validateRequest(request: SearchRequest): SearchRequest {
    const query = request.query.trim();
    if (!query || query.length > 500) throw new BadRequestException({ code: "INVALID_SEARCH_QUERY", message: "Search query must contain 1 to 500 characters." });
    const maxResults = request.maxResults ?? 5;
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 10) throw new BadRequestException({ code: "INVALID_SEARCH_MAX_RESULTS", message: "maxResults must be between 1 and 10." });
    const normalizedDomains = (domains: string[] | undefined) => domains?.map((domain) => domain.trim().toLowerCase()).filter(Boolean).slice(0, 20);
    return { query, searchDepth: request.searchDepth ?? "basic", maxResults, includeDomains: normalizedDomains(request.includeDomains), excludeDomains: normalizedDomains(request.excludeDomains) };
  }

  async searchForResearch(context: RequestContext, input: ResearchSearchInput): Promise<SearchResponse> {
    const request = this.validateRequest(input.request);
    const connection = await this.policy.requireResearchPolicy(context, input.agentId, input.connectionId);
    const adapter = this.adapters.get(connection.provider);
    if (!adapter) throw new SearchProviderRuntimeError("SEARCH_PROVIDER_UNSUPPORTED", "Configured search provider is not supported.");
    let apiKey: string;
    try {
      apiKey = decryptCredential({ encryptedApiKey: connection.encryptedApiKey, keyIv: connection.keyIv, keyAuthTag: connection.keyAuthTag, keyVersion: "v1" }, { organizationId: context.organizationId, connectionId: connection.id, provider: connection.provider });
    } catch {
      throw new SearchProviderRuntimeError("SEARCH_PROVIDER_UNAVAILABLE", "Stored search provider credential is unavailable.");
    }
    return adapter.search(apiKey, request);
  }
}
