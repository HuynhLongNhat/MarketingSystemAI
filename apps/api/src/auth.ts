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
import { APIError, createAuthMiddleware } from "better-auth/api";
import { and, eq } from "drizzle-orm";

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set and contain at least 32 characters.",
  );
}

export const auth = betterAuth({
  appName: "MarketingSystemAI",

  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",

  trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],

  secret,

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/organization/set-active" || ctx.method !== "POST") {
        return;
      }

      const body = ctx.body as { organizationId?: unknown } | undefined;

      const organizationId = body?.organizationId;

      // Chỉ xử lý trường hợp chọn Organization bằng ID.
      // Những trường hợp khác tiếp tục để Better Auth kiểm tra.
      if (typeof organizationId !== "string" || organizationId.length === 0) {
        return;
      }

      const currentSession = await auth.api.getSession({
        headers: ctx.headers ?? new Headers(),
      });
      if (!currentSession) {
        throw new APIError("UNAUTHORIZED", {
          message: "Authentication required",
        });
      }

      const [membership] = await db
        .select({ organizationId: member.organizationId })
        .from(member)
        .where(
          and(
            eq(member.organizationId, organizationId),
            eq(member.userId, currentSession.user.id),
          ),
        )
        .limit(1);

      if (!membership) {
        throw new APIError("FORBIDDEN", {
          message: "Organization membership required",
        });
      }
    }),
  },

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
