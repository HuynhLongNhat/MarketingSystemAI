
import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { db, member } from "@workspace/db/node";
import { UnrecoverableError } from "bullmq";

import type { OrganizationRole } from "../auth/request-context.js";
import {
  hasPermission,
  type Permission,
} from "../common/permissions/permissions.js";

const VALID_ROLES = new Set<string>([
  "owner",
  "admin",
  "member",
]);

@Injectable()
export class TenantJobAuthorization {
  async authorize(
    organizationId: string,
    requestedBy: string,
    requiredPermission?: Permission,
  ): Promise<OrganizationRole> {
    if (!organizationId || !requestedBy) {
      throw new UnrecoverableError(
        "Invalid tenant job identity",
      );
    }

    const [membership] = await db
      .select({
        role: member.role,
      })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, requestedBy),
        ),
      )
      .limit(1);

    if (
      !membership ||
      !VALID_ROLES.has(membership.role)
    ) {
      throw new UnrecoverableError(
        "Organization membership required",
      );
    }

    const role =
      membership.role as OrganizationRole;

    if (
      requiredPermission &&
      !hasPermission(role, requiredPermission)
    ) {
      throw new UnrecoverableError(
        "Insufficient organization permissions",
      );
    }

    return role;
  }
}
