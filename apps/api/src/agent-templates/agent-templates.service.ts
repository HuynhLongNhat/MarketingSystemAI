
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  and,
  desc,
  eq,
  isNull,
  or,
} from "drizzle-orm";

import {
  agentTemplates,
  aiAgents,
  db,
} from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import { AgentsService } from "../agents/agents.service.js";

import type {
  CreateAgentTemplateDto,
  UpdateAgentTemplateDto,
} from "./agent-templates.dto.js";

import type { CreateAgentFromTemplateDto } from "./create-agent-from-template.dto.js";

@Injectable()
export class AgentTemplatesService {
  constructor(
    private readonly agentsService: AgentsService,
  ) {}

  private required(
    value: string,
    field: string,
  ): string {
    const result = value.trim();

    if (!result) {
      throw new BadRequestException(
        `${field} cannot be empty`,
      );
    }

    return result;
  }

  private visibleTo(
    context: RequestContext,
  ) {
    return or(
      eq(
        agentTemplates.organizationId,
        context.organizationId,
      ),
      and(
        isNull(agentTemplates.organizationId),
        eq(
          agentTemplates.isPublished,
          true,
        ),
      ),
    )!;
  }

  private ownedBy(
    context: RequestContext,
    id: string,
  ) {
    return and(
      eq(agentTemplates.id, id),
      eq(
        agentTemplates.organizationId,
        context.organizationId,
      ),
    )!;
  }

  private async ensureSlugAvailable(
    context: RequestContext,
    slug: string,
    excludeId?: string,
  ) {
    const [existing] = await db
      .select({
        id: agentTemplates.id,
      })
      .from(agentTemplates)
      .where(
        and(
          eq(
            agentTemplates.organizationId,
            context.organizationId,
          ),
          eq(agentTemplates.slug, slug),
        ),
      )
      .limit(1);

    if (
      existing &&
      existing.id !== excludeId
    ) {
      throw new ConflictException(
        "Template slug already exists in this organization",
      );
    }
  }

  list(context: RequestContext) {
    return db
      .select()
      .from(agentTemplates)
      .where(this.visibleTo(context))
      .orderBy(
        desc(agentTemplates.createdAt),
      )
      .limit(100);
  }

  async getById(
    context: RequestContext,
    id: string,
  ) {
    const [template] = await db
      .select()
      .from(agentTemplates)
      .where(
        and(
          eq(agentTemplates.id, id),
          this.visibleTo(context),
        ),
      )
      .limit(1);

    if (!template) {
      throw new NotFoundException(
        "Agent template not found",
      );
    }

    return template;
  }

  async create(
    context: RequestContext,
    dto: CreateAgentTemplateDto,
  ) {
    const name = this.required(
      dto.name,
      "name",
    );

    const slug = this.required(
      dto.slug,
      "slug",
    );

    const systemPrompt = this.required(
      dto.systemPrompt,
      "systemPrompt",
    );

    await this.ensureSlugAvailable(
      context,
      slug,
    );

    const [template] = await db
      .insert(agentTemplates)
      .values({
        id: randomUUID(),
        organizationId:
          context.organizationId,
        name,
        slug,
        category:
          dto.category ?? "other",
        description:
          dto.description?.trim() || null,
        systemPrompt,
        version:
          dto.version?.trim() || "1.0.0",
        isPublished:
          dto.isPublished ?? false,
      })
      .returning();

    if (!template) {
      throw new Error(
        "Agent template insert failed",
      );
    }

    return template;
  }

  async update(
    context: RequestContext,
    id: string,
    dto: UpdateAgentTemplateDto,
  ) {
    if (
      Object.keys(dto).length === 0
    ) {
      throw new BadRequestException(
        "At least one update field is required",
      );
    }

    const [existing] = await db
      .select({
        id: agentTemplates.id,
      })
      .from(agentTemplates)
      .where(
        this.ownedBy(context, id),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException(
        "Agent template not found",
      );
    }

    if (
      dto.slug !== undefined
    ) {
      await this.ensureSlugAvailable(
        context,
        dto.slug,
        id,
      );
    }

    const changes: Partial<
      typeof agentTemplates.$inferInsert
    > = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) {
      changes.name = this.required(
        dto.name,
        "name",
      );
    }

    if (dto.slug !== undefined) {
      changes.slug = this.required(
        dto.slug,
        "slug",
      );
    }

    if (
      dto.category !== undefined
    ) {
      changes.category =
        dto.category;
    }

    if (
      dto.description !== undefined
    ) {
      changes.description =
        dto.description.trim() || null;
    }

    if (
      dto.systemPrompt !== undefined
    ) {
      changes.systemPrompt =
        this.required(
          dto.systemPrompt,
          "systemPrompt",
        );
    }

    if (
      dto.version !== undefined
    ) {
      changes.version =
        this.required(
          dto.version,
          "version",
        );
    }

    if (
      dto.isPublished !== undefined
    ) {
      changes.isPublished =
        dto.isPublished;
    }

    const [updated] = await db
      .update(agentTemplates)
      .set(changes)
      .where(
        this.ownedBy(context, id),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException(
        "Agent template not found",
      );
    }

    return updated;
  }

  async createAgentFromTemplate(
    context: RequestContext,
    templateId: string,
    dto: CreateAgentFromTemplateDto,
  ) {
    const template = await this.getById(
      context,
      templateId,
    );

    const agent = await this.agentsService.create(
      context,
      {
        name:
          dto.name ?? template.name,
        role:
          template.slug.replace(
            /-/g,
            "_",
          ),
        description:
          template.description ??
          undefined,
        systemPrompt:
          template.systemPrompt,
        departmentId:
          dto.departmentId,
        connectionId:
          dto.connectionId,
        modelId:
          dto.modelId,
        enabledTools:
          dto.enabledTools ?? [],
      },
      template.id,
    );

    return agent;
  }

  async remove(
    context: RequestContext,
    id: string,
  ) {
    const [existing] = await db
      .select({
        id: agentTemplates.id,
      })
      .from(agentTemplates)
      .where(
        this.ownedBy(context, id),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException(
        "Agent template not found",
      );
    }

    const [usedByAgent] = await db
      .select({
        id: aiAgents.id,
      })
      .from(aiAgents)
      .where(
        eq(
          aiAgents.templateId,
          id,
        ),
      )
      .limit(1);

    if (usedByAgent) {
      throw new ConflictException(
        "Cannot delete a template referenced by an AI agent",
      );
    }

    const [deleted] = await db
      .delete(agentTemplates)
      .where(
        this.ownedBy(context, id),
      )
      .returning({
        id: agentTemplates.id,
      });

    if (!deleted) {
      throw new NotFoundException(
        "Agent template not found",
      );
    }

    return {
      success: true,
      id: deleted.id,
    };
  }
}
