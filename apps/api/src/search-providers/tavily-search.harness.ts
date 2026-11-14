/**
 * Development-only manual verification. It never prints stored credentials.
 * Usage: pnpm --filter @workspace/api research:tavily -- <organizationId> <agentId> <query> [connectionId]
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env.local"), quiet: true });

const [organizationId, agentId, query, connectionId] = process.argv.slice(2);
if (!organizationId || !agentId || !query) {
  throw new Error("Usage: research:tavily <organizationId> <agentId> <query> [connectionId]");
}

const [{ pool }, { SearchProvidersService }, { SearchProviderConnectionTestService }, { TavilySearchAdapter }, { SearchProviderRuntimeService }] = await Promise.all([
  import("@workspace/db/node"),
  import("./search-providers.service.js"),
  import("./search-provider-connection-test.service.js"),
  import("./tavily-search.adapter.js"),
  import("./search-provider-runtime.service.js"),
]);

try {
  const policy = new SearchProvidersService(new SearchProviderConnectionTestService());
  const runtime = new SearchProviderRuntimeService(policy, new TavilySearchAdapter());
  const result = await runtime.searchForResearch({ organizationId, userId: "development-research-harness", sessionId: "development-research-harness", role: "owner" }, { agentId, connectionId, request: { query } });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await pool.end();
}
