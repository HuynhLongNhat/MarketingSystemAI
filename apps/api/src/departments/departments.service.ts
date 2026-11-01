
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, departments, aiAgents } from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from "./departments.dto.js";

@Injectable()
export class DepartmentsService {
  private normalizeName(name: string): string {
    const value = name.trim();

    if (!value) {
      throw new BadRequestException("Department name cannot be empty");
    }

    return value;
  }

  private normalizeSlug(slug: string): string {
    const value = slug.trim();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      throw new BadRequestException("Invalid department slug");
    }

    return value;
  }

  private async ensureSlugAvailable(
    organizationId: string,
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const [existing] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.organizationId, organizationId),
          eq(departments.slug, slug),
        ),
      )
      .limit(1);

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        "Department slug already exists in this organization",
      );
    }
  }

  list(context: RequestContext) {
    return db
      .select()
      .from(departments)
      .where(eq(departments.organizationId, context.organizationId))
      .orderBy(desc(departments.createdAt))
      .limit(100);
  }

  async getById(context: RequestContext, id: string) {
    const [department] = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.organizationId, context.organizationId),
          eq(departments.id, id),
        ),
      )
      .limit(1);

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return department;
  }

  async create(context: RequestContext, dto: CreateDepartmentDto) {
    const name = this.normalizeName(dto.name);
    const slug = this.normalizeSlug(dto.slug);

    await this.ensureSlugAvailable(context.organizationId, slug);

    try {
      const [department] = await db
        .insert(departments)
        .values({
          id: randomUUID(),
          organizationId: context.organizationId,
          name,
          slug,
          description: dto.description?.trim() || null,
        })
        .returning();

      return department;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Department slug already exists");
      }

      throw error;
    }
  }

  async update(
    context: RequestContext,
    id: string,
    dto: UpdateDepartmentDto,
  ) {
    await this.getById(context, id);

    const changes: {
      name?: string;
      slug?: string;
      description?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) {
      changes.name = this.normalizeName(dto.name);
    }

    if (dto.slug !== undefined) {
      changes.slug = this.normalizeSlug(dto.slug);

      await this.ensureSlugAvailable(
        context.organizationId,
        changes.slug,
        id,
      );
    }

    if (dto.description !== undefined) {
      changes.description = dto.description.trim() || null;
    }

    try {
      const [department] = await db
        .update(departments)
        .set(changes)
        .where(
          and(
            eq(departments.organizationId, context.organizationId),
            eq(departments.id, id),
          ),
        )
        .returning();

      if (!department) {
        throw new NotFoundException("Department not found");
      }

      return department;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Department slug already exists");
      }

      throw error;
    }
  }

  async remove(context: RequestContext, id: string) {
    await this.getById(context, id);

    const [assignedAgent] = await db
      .select({ id: aiAgents.id })
      .from(aiAgents)
      .where(
        and(
          eq(aiAgents.organizationId, context.organizationId),
          eq(aiAgents.departmentId, id),
        ),
      )
      .limit(1);

    if (assignedAgent) {
      throw new ConflictException(
        "Cannot delete a department with assigned AI agents",
      );
    }

    try {
      const [deleted] = await db
        .delete(departments)
        .where(
          and(
            eq(departments.organizationId, context.organizationId),
            eq(departments.id, id),
          ),
        )
        .returning({ id: departments.id });

      if (!deleted) {
        throw new NotFoundException("Department not found");
      }

      return { success: true, id: deleted.id };
    } catch (error) {
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          "Cannot delete a department with assigned AI agents",
        );
      }

      throw error;
    }
  }

  private getDatabaseErrorCode(error: unknown): string | undefined {
    if (typeof error !== "object" || error === null) {
      return undefined;
    }

    const candidate = error as {
      code?: string;
      cause?: unknown;
    };

    if (candidate.code === "23505" || candidate.code === "23503") {
      return candidate.code;
    }

    return this.getDatabaseErrorCode(candidate.cause);
  }

  private isUniqueViolation(error: unknown): boolean {
    return this.getDatabaseErrorCode(error) === "23505";
  }

  private isForeignKeyViolation(error: unknown): boolean {
    return this.getDatabaseErrorCode(error) === "23503";
  }
}
