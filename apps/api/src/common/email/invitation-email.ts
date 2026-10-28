
type InvitationEmailInput = {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationId: string;
};

export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  invitationId,
}: InvitationEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_FROM_EMAIL;
  const webUrl = process.env.WEB_URL?.split(",")[0]?.trim();

  if (!apiKey || !from || !webUrl) {
    throw new Error(
      "Invitation email is not configured. Set RESEND_API_KEY, INVITATION_FROM_EMAIL and WEB_URL.",
    );
  }

  const invitationUrl = new URL("/accept-invitation", webUrl);
  invitationUrl.searchParams.set("invitationId", invitationId);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Invitation to join ${organizationName}`,
      text: [
        `${inviterName} invited you to join ${organizationName}.`,
        "",
        `Accept your invitation: ${invitationUrl.toString()}`,
        "",
        "If you did not expect this invitation, you can ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Invitation email delivery failed (${response.status})`,
    );
  }
}
