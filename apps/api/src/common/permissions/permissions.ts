
import type { OrganizationRole } from "../../auth/request-context.js";

export const PERMISSIONS = {
  ORGANIZATION_READ: "organization:read",
  ORGANIZATION_UPDATE: "organization:update",
  ORGANIZATION_DELETE: "organization:delete",

  MEMBER_READ: "member:read",
  MEMBER_INVITE: "member:invite",
  MEMBER_UPDATE: "member:update",
  MEMBER_REMOVE: "member:remove",

  WIDGET_READ: "widget:read",
  WIDGET_UPDATE: "widget:update",

  CONVERSATION_READ: "conversation:read",
  CONVERSATION_UPDATE: "conversation:update",

  KNOWLEDGE_READ: "knowledge:read",
  KNOWLEDGE_UPDATE: "knowledge:update",

  AI_PROVIDER_READ: "ai_provider:read",
  AI_PROVIDER_MANAGE: "ai_provider:manage",

  AI_USAGE_QUOTA_READ: "ai_usage_quota:read",
  AI_USAGE_QUOTA_MANAGE: "ai_usage_quota:manage",

  DEPARTMENT_READ: "department:read",
  DEPARTMENT_MANAGE: "department:manage",

  BILLING_READ: "billing:read",
  BILLING_MANAGE: "billing:manage",

  AGENT_READ: "agent:read",
  AGENT_MANAGE: "agent:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<OrganizationRole, readonly Permission[]> =
  {
    owner: ALL_PERMISSIONS,

    admin: ALL_PERMISSIONS.filter(
      (permission) =>
        permission !== PERMISSIONS.ORGANIZATION_DELETE &&
        permission !== PERMISSIONS.BILLING_MANAGE,
    ),

    member: [
      PERMISSIONS.ORGANIZATION_READ,
      PERMISSIONS.WIDGET_READ,
      PERMISSIONS.CONVERSATION_READ,
      PERMISSIONS.KNOWLEDGE_READ,
      PERMISSIONS.DEPARTMENT_READ,
      PERMISSIONS.AGENT_READ,
    ],
  };

export function hasPermission(
  role: OrganizationRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
