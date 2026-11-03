
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { organization, phoneNumber } from "better-auth/plugins";
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
import { sendPasswordResetEmail } from "./common/email/password-reset-email.js";
import { sendInvitationEmail } from "./common/email/invitation-email.js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { createSmsProvider } from "./common/sms/create-sms-provider.js";
import { SmsNotConfiguredError } from "./common/sms/sms-provider.js";
import {
  checkSendOtp,
  InMemoryOtpRateLimiter,
} from "./auth/otp-rate-limiter.js";
import {
  isValidPhoneNumber,
  tempEmailForPhone,
} from "./auth/phone-number.js";

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set and contain at least 32 characters.",
  );
}

const isProduction = process.env.NODE_ENV === "production";

const OTP_LENGTH = 6;
const OTP_EXPIRES_IN_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 3;

const smsProvider = createSmsProvider();
const otpRateLimiter = new InMemoryOtpRateLimiter();

/** Origin tin cậy lấy từ WEB_URL (phân tách bằng dấu phẩy); localhost chỉ cho môi trường dev. */
function resolveTrustedOrigins(): string[] {
  const configured = (process.env.WEB_URL ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  return isProduction
    ? configured
    : [
        ...new Set([
          ...configured,
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ]),
      ];
}

/** Chỉ bật provider khi có đủ Client ID và Client Secret. */
function buildSocialProviders() {
  const google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
  const facebook = {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  };

  return {
    ...(google.clientId && google.clientSecret
      ? {
          google: {
            clientId: google.clientId,
            clientSecret: google.clientSecret,
            prompt: "select_account" as const,
          },
        }
      : {}),
    ...(facebook.clientId && facebook.clientSecret
      ? {
          facebook: {
            clientId: facebook.clientId,
            clientSecret: facebook.clientSecret,
            scopes: ["email", "public_profile"],
          },
        }
      : {}),
  };
}

/**
 * Resolve client IP.
 *
 * Production:
 * - Only trust CF-Connecting-IP supplied by Cloudflare.
 * - Never fall back to X-Forwarded-For or X-Real-IP.
 * - The origin must be protected against direct access that bypasses Cloudflare.
 *
 * Development:
 * - Allow local proxy headers for development/testing.
 */
function clientIp(headers: Headers | undefined): string {
  if (!headers) {
    return "unknown";
  }

  if (isProduction) {
    const cloudflareIp = headers.get("cf-connecting-ip")?.trim();

    return cloudflareIp || "unknown";
  }

  const forwarded = headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return (
    forwarded ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export const auth = betterAuth({
  appName: "MarketingSystemAI",

  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",

  trustedOrigins: resolveTrustedOrigins(),

  socialProviders: buildSocialProviders(),

  account: {
    accountLinking: {
      enabled: true,
      // Không tin provider nào mặc định: chỉ liên kết khi provider xác nhận email đã xác minh.
      trustedProviders: [],
      allowDifferentEmails: false,
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/phone-number/send-otp": { window: 60, max: 3 },
      "/phone-number/verify": { window: 60, max: 10 },
      "/sign-in/email": { window: 60, max: 10 },
    },
  },

  secret,

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/phone-number/send-otp" && ctx.method === "POST") {
        const body = ctx.body as { phoneNumber?: unknown } | undefined;
        const phone = body?.phoneNumber;

        // Số không hợp lệ để plugin trả lỗi validation; không tốn quota SMS.
        if (isValidPhoneNumber(phone)) {
          const retryAfter = checkSendOtp(otpRateLimiter, {
            phoneNumber: phone,
            ip: clientIp(ctx.headers),
          });

          if (retryAfter !== null) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: `Bạn đã yêu cầu mã quá nhiều lần. Thử lại sau ${retryAfter} giây.`,
            });
          }
        }
        return;
      }

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

    async sendResetPassword({ user, url }) {
      await sendPasswordResetEmail({ to: user.email, resetUrl: url });
    },
  },
  plugins: [
    phoneNumber({
      otpLength: OTP_LENGTH,
      expiresIn: OTP_EXPIRES_IN_SECONDS,
      allowedAttempts: OTP_MAX_ATTEMPTS,
      phoneNumberValidator: (value) => isValidPhoneNumber(value),

      async sendOTP({ phoneNumber: to, code }) {
        const minutes = Math.round(OTP_EXPIRES_IN_SECONDS / 60);
        try {
          // Không ghi `code` vào log ở bất kỳ nhánh nào.
          await smsProvider.send({
            to,
            body: `Ma xac minh MarketingSystemAI: ${code}. Co hieu luc ${minutes} phut. Khong chia se ma nay cho bat ky ai.`,
          });
        } catch (error) {
          if (error instanceof SmsNotConfiguredError) {
            throw new APIError("SERVICE_UNAVAILABLE", {
              message: "Đăng nhập bằng số điện thoại hiện chưa khả dụng.",
            });
          }
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "Không thể gửi SMS lúc này. Vui lòng thử lại sau.",
          });
        }
      },

      // Số điện thoại mới -> tạo user mới sau khi OTP hợp lệ.
      // Không tự gộp vào user khác: muốn liên kết, user phải đăng nhập rồi xác minh OTP.
      signUpOnVerification: {
        getTempEmail: tempEmailForPhone,
        getTempName: (phone) => phone,
      },
    }),
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
