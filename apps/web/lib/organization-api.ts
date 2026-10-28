
import { authClient } from "./auth-client";

export type MemberRole = "owner" | "admin" | "member";

export async function inviteOrganizationMember(
  email: string,
  role: "admin" | "member",
) {
  return authClient.organization.inviteMember({
    email,
    role,
  });
}

export async function listOrganizationMembers() {
  return authClient.organization.listMembers();
}

export async function updateOrganizationMemberRole(
  memberId: string,
  role: MemberRole,
) {
  return authClient.organization.updateMemberRole({
    memberId,
    role,
  });
}

export async function removeOrganizationMember(
  memberId: string,
) {
  return authClient.organization.removeMember({
    memberIdOrEmail: memberId,
  });
}

export async function listOrganizationInvitations() {
  return authClient.organization.listInvitations();
}

export async function cancelOrganizationInvitation(
  invitationId: string,
) {
  return authClient.organization.cancelInvitation({
    invitationId,
  });
}
