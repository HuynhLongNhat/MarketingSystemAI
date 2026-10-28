
import type { Request } from "express";

export type OrganizationRole = "owner" | "admin" | "member";

export interface RequestContext {
  userId: string;
  sessionId: string;
  organizationId: string;
  role: OrganizationRole;
}

export interface AuthenticatedRequest extends Request {
  requestContext?: RequestContext;
}
