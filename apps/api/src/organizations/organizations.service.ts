
import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { db, organization, member, user } from "@workspace/db/node";
import { eq } from "drizzle-orm";

import type { RequestContext } from "../auth/request-context.js";
import { tenantWhere } from "../common/tenant/tenant-query.js";

@Injectable()
export class OrganizationsService {
  async getOrganization(context: RequestContext) {
    const [result] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
      })
      .from(organization)
      .where(
        tenantWhere(context, organization.id),
      )
      .limit(1);

    if (!result) {
      throw new NotFoundException(
        "Organization not found",
      );
    }

    return result;
  }

  async listMembers(context: RequestContext) {
    return db
      .select({
        id: member.id,
        userId: member.userId,
        name: user.name,
        email: user.email,
        role: member.role,
        joinedAt: member.createdAt,
      })
      .from(member)
      .innerJoin(
        user,
        eq(member.userId, user.id),
      )
      .where(
        tenantWhere(
          context,
          member.organizationId,
        ),
      );
  }
}
