
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import {
  aiAgents,
  aiProviderConnections,
  db,
  departments,
  officeDeskAssignments,
} from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import type {
  CreateAgentDto,
  UpdateAgentDto,
} from "./agents.dto.js";
import { normalizeAgentCapabilities } from "./agent-capabilities.js";

function databaseErrorCode(
  error: unknown,
): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const value = error as {
    code?: unknown;
    cause?: unknown;
  };

  if (typeof value.code === "string") {
    return value.code;
  }

  return databaseErrorCode(value.cause);
}

@Injectable()
export class AgentsService {
  private required(
    value: string,
    field: string,
  ): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(
        `${field} cannot be empty`,
      );
    }

    return normalized;
  }

  private async validateDepartment(
    context: RequestContext,
    departmentId: string | null | undefined,
  ): Promise<void> {
    if (!departmentId) return;

    const [department] = await db
      .select({
        id: departments.id,
      })
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(
            departments.organizationId,
            context.organizationId,
          ),
        ),
      )
      .limit(1);

    if (!department) {
      throw new BadRequestException(
        "Department does not belong to this organization",
      );
    }
  }

  private async validateConnection(
    context: RequestContext,
    connectionId: string | null | undefined,
  ): Promise<void> {
    if (!connectionId) return;

    const [connection] = await db
      .select({
        id: aiProviderConnections.id,
        enabled: aiProviderConnections.enabled,
      })
      .from(aiProviderConnections)
      .where(
        and(
          eq(aiProviderConnections.id, connectionId),
          eq(
            aiProviderConnections.organizationId,
            context.organizationId,
          ),
        ),
      )
      .limit(1);

    if (!connection) {
      throw new BadRequestException(
        "AI provider connection does not belong to this organization",
      );
    }

    if (!connection.enabled) {
      throw new BadRequestException(
        "AI provider connection is disabled",
      );
    }
  }

  private async getAgent(
    context: RequestContext,
    id: string,
  ) {
    const [agent] = await db
      .select()
      .from(aiAgents)
      .where(
        and(
          eq(aiAgents.id, id),
          eq(
            aiAgents.organizationId,
            context.organizationId,
          ),
        ),
      )
      .limit(1);

    if (!agent) {
      throw new NotFoundException(
        "AI agent not found",
      );
    }

    return agent;
  }

  list(context: RequestContext) {
    return db
      .select()
      .from(aiAgents)
      .where(
        eq(
          aiAgents.organizationId,
          context.organizationId,
        ),
      )
      .orderBy(desc(aiAgents.createdAt))
      .limit(100);
  }

  getById(
    context: RequestContext,
    id: string,
  ) {
    return this.getAgent(context, id);
  }

  async create(
    context: RequestContext,
    dto: CreateAgentDto,
    templateId?: string,
  ) {
    await this.validateDepartment(
      context,
      dto.departmentId,
    );

    await this.validateConnection(
      context,
      dto.connectionId,
    );

    if (dto.modelId && !dto.connectionId) {
      throw new BadRequestException(
        "A model requires an AI provider connection",
      );
    }

    const enabledTools = normalizeAgentCapabilities(dto.enabledTools);

    try {
      const [agent] = await db
        .insert(aiAgents)
        .values({
          id: randomUUID(),
          organizationId:
            context.organizationId,
          templateId: templateId ?? null,
          name: this.required(
            dto.name,
            "name",
          ),
          role: this.required(
            dto.role,
            "role",
          ),
          systemPrompt: this.required(
            dto.systemPrompt,
            "systemPrompt",
          ),
          description:
            dto.description?.trim() || null,
          departmentId:
            dto.departmentId ?? null,
          connectionId:
            dto.connectionId ?? null,
          modelId:
            dto.modelId?.trim() || null,
          status: "draft",
          toolConfig: {
            enabledTools:
              enabledTools ?? [],
          },
        })
        .returning();

      if (!agent) {
        throw new Error(
          "AI agent insert failed",
        );
      }

      return agent;
    } catch (error) {
      if (
        databaseErrorCode(error) === "23503"
      ) {
        throw new ConflictException(
          "Referenced department or connection is no longer available",
        );
      }

      throw error;
    }
  }

  async update(
    context: RequestContext,
    id: string,
    dto: UpdateAgentDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        "At least one update field is required",
      );
    }

    const existing = await this.getAgent(
      context,
      id,
    );

    await this.validateDepartment(
      context,
      dto.departmentId,
    );

    await this.validateConnection(
      context,
      dto.connectionId,
    );

    const connectionId =
      dto.connectionId === undefined
        ? existing.connectionId
        : dto.connectionId;

    const modelId =
      dto.modelId === undefined
        ? existing.modelId
        : dto.modelId;

    if (modelId && !connectionId) {
      throw new BadRequestException(
        "A model requires an AI provider connection",
      );
    }

    const enabledTools = normalizeAgentCapabilities(dto.enabledTools);

    const changes: Partial<
      typeof aiAgents.$inferInsert
    > = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) {
      changes.name = this.required(
        dto.name,
        "name",
      );
    }

    if (dto.role !== undefined) {
      changes.role = this.required(
        dto.role,
        "role",
      );
    }

    if (dto.systemPrompt !== undefined) {
      changes.systemPrompt = this.required(
        dto.systemPrompt,
        "systemPrompt",
      );
    }

    if (dto.description !== undefined) {
      changes.description =
        dto.description.trim() || null;
    }

    if (dto.departmentId !== undefined) {
      changes.departmentId =
        dto.departmentId;
    }

    if (dto.connectionId !== undefined) {
      changes.connectionId =
        dto.connectionId;
    }

    if (dto.modelId !== undefined) {
      changes.modelId =
        dto.modelId?.trim() || null;
    }

    if (dto.status !== undefined) {
      changes.status = dto.status;
    }

    if (dto.enabledTools !== undefined) {
      changes.toolConfig = {
        enabledTools: enabledTools!,
      };
    }

    try {
      const updated = await db.transaction(
        async (tx) => {
          const [agent] = await tx
            .update(aiAgents)
            .set(changes)
            .where(
              and(
                eq(aiAgents.id, id),
                eq(
                  aiAgents.organizationId,
                  context.organizationId,
                ),
              ),
            )
            .returning();

          if (!agent) {
            throw new NotFoundException(
              "AI agent not found",
            );
          }

          // Ineligible agents must not occupy
          // desks in the virtual office.
          if (
            agent.status === "draft" ||
            agent.status === "archived"
          ) {
            await tx
              .delete(officeDeskAssignments)
              .where(
                and(
                  eq(
                    officeDeskAssignments.organizationId,
                    context.organizationId,
                  ),
                  eq(
                    officeDeskAssignments.agentId,
                    id,
                  ),
                ),
              );
          }

          return agent;
        },
      );

      return updated;
    } catch (error) {
      if (
        databaseErrorCode(error) === "23503"
      ) {
        throw new ConflictException(
          "Referenced department or connection is no longer available",
        );
      }

      throw error;
    }
  }

  async remove(
    context: RequestContext,
    id: string,
  ) {
    const [deleted] = await db
      .delete(aiAgents)
      .where(
        and(
          eq(aiAgents.id, id),
          eq(
            aiAgents.organizationId,
            context.organizationId,
          ),
        ),
      )
      .returning({
        id: aiAgents.id,
      });

    if (!deleted) {
      throw new NotFoundException(
        "AI agent not found",
      );
    }

    return {
      success: true,
      id: deleted.id,
    };
  }
}
