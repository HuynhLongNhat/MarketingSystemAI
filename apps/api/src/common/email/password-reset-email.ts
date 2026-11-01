type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmailInput): Promise<void> {
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
      subject: "Reset your CompanyMarketingSystem password",
      text: [
        "We received a request to reset your password.",
        "",
        "Choose a new password using the link below:",
        resetUrl,
        "",
        "If you did not request this, ignore this email. Your password will not change.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(`Password reset email delivery failed (${response.status})`);
  }
}