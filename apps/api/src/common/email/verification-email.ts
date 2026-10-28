
type VerificationEmailInput = {
  to: string;
  verificationUrl: string;
};

export async function sendVerificationEmail({
  to,
  verificationUrl,
}: VerificationEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "Email service is not configured. Set RESEND_API_KEY and INVITATION_FROM_EMAIL.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Verify your CompanyMarketingSystem email",
      text: [
        "Welcome to CompanyMarketingSystem.",
        "",
        "Verify your email address using the link below:",
        verificationUrl,
        "",
        "If you did not create this account, ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Verification email delivery failed (${response.status})`,
    );
  }
}
