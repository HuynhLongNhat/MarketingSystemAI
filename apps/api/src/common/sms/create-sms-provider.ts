import {
  DisabledSmsProvider,
  type SmsProvider,
} from "./sms-provider.js";
import { TwilioSmsProvider } from "./twilio-sms-provider.js";

/** SMS_PROVIDER: "twilio" | "disabled" (mặc định khi thiếu cấu hình). */
export function createSmsProvider(
  env: NodeJS.ProcessEnv = process.env,
): SmsProvider {
  const name = (env.SMS_PROVIDER ?? "disabled").trim().toLowerCase();

  switch (name) {
    case "twilio": {
      const accountSid = env.TWILIO_ACCOUNT_SID;
      const authToken = env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        throw new Error(
          "SMS_PROVIDER=twilio requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
        );
      }

      return new TwilioSmsProvider({
        accountSid,
        authToken,
        messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID || undefined,
        fromNumber: env.TWILIO_FROM_NUMBER || undefined,
      });
    }
    case "disabled":
    case "":
      return new DisabledSmsProvider();
    default:
      throw new Error(`Unsupported SMS_PROVIDER: ${name}`);
  }
}