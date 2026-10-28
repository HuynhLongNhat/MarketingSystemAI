
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { db, member } from "@workspace/db/node";

import type {
  AuthenticatedRequest,
  OrganizationRole,
} from "./request-context.js";
import { auth } from "src/auth.js";

const VALID_ROLES = new Set(["owner", "admin", "member"]);

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: request.headers.cookie ?? "",
      }),
    });

    if (!session) {
      throw new UnauthorizedException("Authentication required");
    }

    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException("Active organization required");
    }

    const [membership] = await db
      .select({
        role: member.role,
      })
      .from(member)
      .where(
        eq(member.organizationId, organizationId),
      );

    // A membership must belong to BOTH the current user
    // and the active organization.
    const memberships = await db
      .select({
        userId: member.userId,
        role: member.role,
      })
      .from(member)
      .where(eq(member.organizationId, organizationId));

   const [currentMembership] = await db
  .select({ role: member.role })
  .from(member)
  .where(
    and(
      eq(member.organizationId, organizationId),
      eq(member.userId, session.user.id),
    ),
  )
  .limit(1);

    if (!currentMembership) {
      throw new ForbiddenException("Organization membership required");
    }

    if (!VALID_ROLES.has(currentMembership.role)) {
      throw new ForbiddenException("Unsupported organization role");
    }

    request.requestContext = {
      userId: session.user.id,
      sessionId: session.session.id,
      organizationId,
      role: currentMembership.role as OrganizationRole,
    };

    return true;
  }
}
