import { OrganizationRole } from "src/auth/request-context.js";


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

  BILLING_READ: "billing:read",
  BILLING_MANAGE: "billing:manage",
} as const;

export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<
  OrganizationRole,
  readonly Permission[]
> = {
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
  ],
};

export function hasPermission(
  role: OrganizationRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
