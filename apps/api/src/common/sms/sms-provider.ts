export type SendSmsInput = {
  /** Số điện thoại E.164, ví dụ +84912345678 */
  to: string;
  body: string;
};

/**
 * Adapter gửi SMS. Thêm nhà cung cấp mới bằng cách implement interface này
 * rồi đăng ký trong createSmsProvider(); phần còn lại của hệ thống không phải đổi.
 */
export interface SmsProvider {
  send(input: SendSmsInput): Promise<void>;
}

export class SmsNotConfiguredError extends Error {
  constructor() {
    super("SMS provider is not configured.");
    this.name = "SmsNotConfiguredError";
  }
}

/** Dùng khi chưa cấu hình provider: không gửi gì và không ghi nội dung tin nhắn. */
export class DisabledSmsProvider implements SmsProvider {
  async send(): Promise<void> {
    throw new SmsNotConfiguredError();
  }
}

/** Chỉ dùng trong test. Không đăng ký trong createSmsProvider(). */
export class InMemorySmsProvider implements SmsProvider {
  readonly sent: SendSmsInput[] = [];

  async send(input: SendSmsInput): Promise<void> {
    this.sent.push(input);
  }
}