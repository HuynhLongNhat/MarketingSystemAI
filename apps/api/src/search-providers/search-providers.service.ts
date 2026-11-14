import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { aiAgents, db, searchProviderConnections, type SearchProviderConnection } from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import { decryptCredential, encryptCredential } from "../ai-credentials/credential-crypto.js";
import { tenantWhere } from "../common/tenant/tenant-query.js";
import type { CreateSearchProviderDto, UpdateSearchProviderDto } from "./search-providers.dto.js";
import { SearchProviderConnectionTestService } from "./search-provider-connection-test.service.js";

export type SafeSearchProviderConnection = Pick<SearchProviderConnection, "id" | "provider" | "name" | "enabled" | "createdAt" | "updatedAt"> & { hasApiKey: true };
function safeConnection(connection: SearchProviderConnection): SafeSearchProviderConnection {
  return { id: connection.id, provider: connection.provider, name: connection.name, enabled: connection.enabled, hasApiKey: true, createdAt: connection.createdAt, updatedAt: connection.updatedAt };
}
function databaseErrorCode(error: unknown): string | undefined { if (!error || typeof error !== "object") return undefined; const value = error as { code?: unknown; cause?: unknown }; return typeof value.code === "string" ? value.code : databaseErrorCode(value.cause); }

@Injectable()
export class SearchProvidersService {
  constructor(private readonly tester: SearchProviderConnectionTestService) {}

  private async findConnection(context: RequestContext, id: string): Promise<SearchProviderConnection> {
    const [connection] = await db.select().from(searchProviderConnections).where(tenantWhere(context, searchProviderConnections.organizationId, eq(searchProviderConnections.id, id))).limit(1);
    if (!connection) throw new NotFoundException("Search provider connection not found");
    return connection;
  }

  async listConnections(context: RequestContext) {
    const connections = await db.select().from(searchProviderConnections).where(tenantWhere(context, searchProviderConnections.organizationId));
    return connections.map(safeConnection);
  }
  async getConnection(context: RequestContext, id: string) { return safeConnection(await this.findConnection(context, id)); }

  async createConnection(context: RequestContext, dto: CreateSearchProviderDto) {
    const name = dto.name.trim();
    if (!name || !dto.apiKey.trim()) throw new BadRequestException("Tên kết nối và API key không được để trống");
    const id = randomUUID();
    const encrypted = encryptCredential(dto.apiKey, { organizationId: context.organizationId, connectionId: id, provider: dto.provider });
    try {
      const [connection] = await db.insert(searchProviderConnections).values({ id, organizationId: context.organizationId, provider: dto.provider, name, ...encrypted, enabled: true }).returning();
      if (!connection) throw new Error("Search provider connection insert failed");
      return safeConnection(connection);
    } catch (error) { if (databaseErrorCode(error) === "23505") throw new ConflictException("Connection name already exists for this provider"); throw error; }
  }

  async updateConnection(context: RequestContext, id: string, dto: UpdateSearchProviderDto) {
    if (!Object.keys(dto).length) throw new BadRequestException("At least one update field is required");
    const connection = await this.findConnection(context, id);
    const updates: Partial<typeof searchProviderConnections.$inferInsert> = { updatedAt: new Date() };
    if (dto.name !== undefined) { const name = dto.name.trim(); if (!name) throw new BadRequestException("Connection name cannot be empty"); updates.name = name; }
    if (dto.enabled !== undefined) updates.enabled = dto.enabled;
    if (dto.apiKey !== undefined) { if (!dto.apiKey.trim()) throw new BadRequestException("API key cannot be empty"); Object.assign(updates, encryptCredential(dto.apiKey, { organizationId: context.organizationId, connectionId: connection.id, provider: connection.provider })); }
    try {
      const [updated] = await db.update(searchProviderConnections).set(updates).where(tenantWhere(context, searchProviderConnections.organizationId, eq(searchProviderConnections.id, id))).returning();
      if (!updated) throw new NotFoundException("Search provider connection not found");
      return safeConnection(updated);
    } catch (error) { if (databaseErrorCode(error) === "23505") throw new ConflictException("Connection name already exists for this provider"); throw error; }
  }

  async deleteConnection(context: RequestContext, id: string) {
    await this.findConnection(context, id);
    const deleted = await db.delete(searchProviderConnections).where(tenantWhere(context, searchProviderConnections.organizationId, eq(searchProviderConnections.id, id))).returning({ id: searchProviderConnections.id });
    if (!deleted.length) throw new NotFoundException("Search provider connection not found");
    return { deleted: true };
  }

  async testConnection(context: RequestContext, id: string) {
    const connection = await this.findConnection(context, id);
    try {
      const apiKey = decryptCredential({ encryptedApiKey: connection.encryptedApiKey, keyIv: connection.keyIv, keyAuthTag: connection.keyAuthTag, keyVersion: "v1" }, { organizationId: context.organizationId, connectionId: connection.id, provider: connection.provider });
      return this.tester.testTavily(connection, apiKey);
    } catch { return { connectionId: connection.id, provider: connection.provider, status: "unavailable" as const, success: false, message: "Không thể dùng credential đã lưu.", checkedAt: new Date().toISOString() }; }
  }

  /** Used by Task 02-03; it reads server-side agent data, never client tool claims. */
  async requireResearchPolicy(context: RequestContext, agentId: string, connectionId?: string) {
    const [agent] = await db.select().from(aiAgents).where(tenantWhere(context, aiAgents.organizationId, eq(aiAgents.id, agentId))).limit(1);
    if (!agent) throw new NotFoundException("Agent not found");
    if (agent.status !== "active") throw new BadRequestException("Agent must be active for web research");
    if (!agent.toolConfig.enabledTools.includes("web_research")) throw new BadRequestException("Agent is not allowed to use web research");
    const conditions = connectionId ? eq(searchProviderConnections.id, connectionId) : eq(searchProviderConnections.provider, "tavily");
    const [connection] = await db.select().from(searchProviderConnections).where(tenantWhere(context, searchProviderConnections.organizationId, conditions)).limit(1);
    if (!connection || !connection.enabled) throw new BadRequestException("No enabled search provider is configured for this organization");
    return connection;
  }
}
