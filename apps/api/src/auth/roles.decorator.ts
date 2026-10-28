
import { SetMetadata } from "@nestjs/common";
import type { OrganizationRole } from "./request-context.js";

export const ROLES_KEY = "organization_roles";

export const Roles = (...roles: OrganizationRole[]) =>
  SetMetadata(ROLES_KEY, roles);
