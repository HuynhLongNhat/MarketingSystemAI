
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import {
  db,
  knowledgeEntries,
} from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";

import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
} from "./knowledge.dto.js";

@Injectable()
export class KnowledgeService {
  private normalizeRequired(
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

  list(context: RequestContext) {
    return db
      .select()
      .from(knowledgeEntries)
      .where(
        eq(
          knowledgeEntries.organizationId,
          context.organizationId,
        ),
      )
      .orderBy(
        desc(knowledgeEntries.createdAt),
        desc(knowledgeEntries.id),
      )
      .limit(100);
  }

  async getById(
    context: RequestContext,
    id: string,
  ) {
    const [entry] = await db
      .select()
      .from(knowledgeEntries)
      .where(
        and(
          eq(
            knowledgeEntries.organizationId,
            context.organizationId,
          ),
          eq(knowledgeEntries.id, id),
        ),
      )
      .limit(1);

    if (!entry) {
      throw new NotFoundException(
        "Knowledge entry not found",
      );
    }

    return entry;
  }

  async create(
    context: RequestContext,
    dto: CreateKnowledgeDto,
  ) {
    const question = this.normalizeRequired(
      dto.question,
      "question",
    );

    const answer = this.normalizeRequired(
      dto.answer,
      "answer",
    );

    const [entry] = await db
      .insert(knowledgeEntries)
      .values({
        id: randomUUID(),
        organizationId: context.organizationId,
        question,
        answer,
        category: dto.category?.trim() || null,
      })
      .returning();

    return entry;
  }

  async update(
    context: RequestContext,
    id: string,
    dto: UpdateKnowledgeDto,
  ) {
    const changes: {
      question?: string;
      answer?: string;
      category?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (dto.question !== undefined) {
      changes.question = this.normalizeRequired(
        dto.question,
        "question",
      );
    }

    if (dto.answer !== undefined) {
      changes.answer = this.normalizeRequired(
        dto.answer,
        "answer",
      );
    }

    if (dto.category !== undefined) {
      changes.category = dto.category.trim() || null;
    }

    const [entry] = await db
      .update(knowledgeEntries)
      .set(changes)
      .where(
        and(
          eq(
            knowledgeEntries.organizationId,
            context.organizationId,
          ),
          eq(knowledgeEntries.id, id),
        ),
      )
      .returning();

    if (!entry) {
      throw new NotFoundException(
        "Knowledge entry not found",
      );
    }

    return entry;
  }

  async remove(
    context: RequestContext,
    id: string,
  ) {
    const [entry] = await db
      .delete(knowledgeEntries)
      .where(
        and(
          eq(
            knowledgeEntries.organizationId,
            context.organizationId,
          ),
          eq(knowledgeEntries.id, id),
        ),
      )
      .returning({
        id: knowledgeEntries.id,
      });

    if (!entry) {
      throw new NotFoundException(
        "Knowledge entry not found",
      );
    }

    return {
      success: true,
      id: entry.id,
    };
  }
}
