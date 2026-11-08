import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  websiteProjects,
  type WebsiteProject,
} from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";

@Injectable()
export class WebsiteProjectsRepository {
  list(context: RequestContext): Promise<WebsiteProject[]> {
    return db
      .select()
      .from(websiteProjects)
      .where(eq(websiteProjects.organizationId, context.organizationId))
      .orderBy(desc(websiteProjects.updatedAt));
  }

  async findById(context: RequestContext, id: string) {
    const [project] = await db
      .select()
      .from(websiteProjects)
      .where(
        and(
          eq(websiteProjects.organizationId, context.organizationId),
          eq(websiteProjects.id, id),
        ),
      )
      .limit(1);
    return project;
  }

  async create(
    context: RequestContext,
    values: Pick<WebsiteProject, "name" | "description" | "templateId">,
  ) {
    const [project] = await db
      .insert(websiteProjects)
      .values({
        id: randomUUID(),
        organizationId: context.organizationId,
        projectType: "landing_page",
        ...values,
      })
      .returning();
    return project;
  }

  async update(
    context: RequestContext,
    id: string,
    values: Partial<Pick<WebsiteProject, "name" | "description">>,
  ) {
    const [project] = await db
      .update(websiteProjects)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(websiteProjects.organizationId, context.organizationId),
          eq(websiteProjects.id, id),
        ),
      )
      .returning();
    return project;
  }

  async remove(context: RequestContext, id: string) {
    const [project] = await db
      .delete(websiteProjects)
      .where(
        and(
          eq(websiteProjects.organizationId, context.organizationId),
          eq(websiteProjects.id, id),
        ),
      )
      .returning();
    return project;
  }
}
