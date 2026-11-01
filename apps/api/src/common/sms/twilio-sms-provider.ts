import type { SendSmsInput, SmsProvider } from "./sms-provider.js";

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  /** Một trong hai: messagingServiceSid (khuyến nghị) hoặc fromNumber. */
  messagingServiceSid?: string;
  fromNumber?: string;
};

/** Gửi SMS qua Twilio Programmable Messaging (REST, không cần SDK). */
export class TwilioSmsProvider implements SmsProvider {
  constructor(
    private readonly config: TwilioConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!config.messagingServiceSid && !config.fromNumber) {
      throw new Error(
        "Twilio requires TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER.",
      );
    }
  }

  async send({ to, body }: SendSmsInput): Promise<void> {
    const { accountSid, authToken, messagingServiceSid, fromNumber } =
      this.config;

    const form = new URLSearchParams({ To: to, Body: body });
    if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
    else if (fromNumber) form.set("From", fromNumber);

    const response = await this.fetchImpl(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      },
    );

    if (!response.ok) {
      // Chỉ ghi status: không đưa số điện thoại, nội dung (có OTP) hay credentials vào lỗi.
      throw new Error(`Twilio SMS delivery failed (${response.status})`);
    }
  }
}