
import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import {
  db,
  organization,
  member,
  user,
} from "@workspace/db/node";

@Injectable()
export class OrganizationsService {
  async getOrganization(organizationId: string) {
    const [result] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!result) {
      throw new NotFoundException("Organization not found");
    }

    return result;
  }

  async listMembers(organizationId: string) {
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
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId));
  }
}
