import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { organization } from "better-auth/plugins";
import { sendVerificationEmail } from "./common/email/verification-email.js";
import {
  db,
  user,
  session,
  account,
  verification,
  organization as organizationTable,
  member,
  invitation,
} from "@workspace/db/node";
import { sendInvitationEmail } from "./common/email/invitation-email.js";
const secret = process.env.BETTER_AUTH_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set and contain at least 32 characters.",
  );
}

export const auth = betterAuth({
  appName: "MarketingSystemAI",

  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",

  secret,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      organization: organizationTable,
      member,
      invitation,
    },
  }),

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,

    async sendVerificationEmail({ user, url }) {
      await sendVerificationEmail({
        to: user.email,
        verificationUrl: url,
      });
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      membershipLimit: 100,
      invitationExpiresIn: 60 * 60 * 48,
      requireEmailVerificationOnInvitation: true,

      async sendInvitationEmail(data) {
        await sendInvitationEmail({
          to: data.email,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          invitationId: data.id,
        });
      },
    }),
  ],
});
