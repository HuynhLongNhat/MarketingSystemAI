import { Injectable } from "@nestjs/common";

import type { SearchProviderConnection } from "@workspace/db/node";

export type SearchConnectionTestStatus = "connected" | "unauthorized" | "rate_limited" | "timeout" | "unavailable" | "disabled";
export interface SearchConnectionTestResult {
  connectionId: string;
  provider: string;
  status: SearchConnectionTestStatus;
  success: boolean;
  message: string;
  checkedAt: string;
}

@Injectable()
export class SearchProviderConnectionTestService {
  private result(connection: SearchProviderConnection, status: SearchConnectionTestStatus, message: string): SearchConnectionTestResult {
    return { connectionId: connection.id, provider: connection.provider, status, success: status === "connected", message, checkedAt: new Date().toISOString() };
  }

  async testTavily(connection: SearchProviderConnection, apiKey: string): Promise<SearchConnectionTestResult> {
    if (!connection.enabled) return this.result(connection, "disabled", "Kết nối đang tắt.");
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ api_key: apiKey, query: "connection verification", search_depth: "basic", max_results: 1 }),
        signal: AbortSignal.timeout(5_000),
        redirect: "error",
      });
      await response.body?.cancel();
      if (response.ok) return this.result(connection, "connected", "Tavily đã chấp nhận API key.");
      if (response.status === 401 || response.status === 403) return this.result(connection, "unauthorized", "Tavily từ chối API key.");
      if (response.status === 429) return this.result(connection, "rate_limited", "Tavily đang giới hạn yêu cầu. Hãy thử lại sau.");
      return this.result(connection, "unavailable", "Không thể kiểm tra Tavily lúc này.");
    } catch (error) {
      const timeout = error instanceof DOMException && error.name === "TimeoutError";
      return this.result(connection, timeout ? "timeout" : "unavailable", timeout ? "Kiểm tra Tavily đã quá thời gian chờ." : "Không thể kết nối tới Tavily.");
    }
  }
}
