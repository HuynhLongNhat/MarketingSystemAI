/**
 * Giới hạn số lần gửi OTP theo từng khóa (số điện thoại, IP).
 * Bộ nhớ trong tiến trình: đủ cho một instance. Khi chạy nhiều instance,
 * hãy thay bằng Redis (ioredis đã có sẵn) qua cùng interface này.
 */
export interface OtpRateLimiter {
  /** Trả về số giây phải chờ nếu bị chặn, ngược lại ghi nhận một lần gửi và trả null. */
  consume(key: string, rule: OtpRateRule): number | null;
}

export type OtpRateRule = { max: number; windowSeconds: number };

export class InMemoryOtpRateLimiter implements OtpRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  consume(key: string, rule: OtpRateRule): number | null {
    const now = this.now();
    const windowMs = rule.windowSeconds * 1000;
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);

    if (recent.length >= rule.max) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((recent[0]! + windowMs - now) / 1000));
    }

    recent.push(now);
    this.hits.set(key, recent);
    return null;
  }
}

export type SendOtpLimits = {
  cooldownSeconds: number;
  perPhone: OtpRateRule;
  perIp: OtpRateRule;
};

export const DEFAULT_SEND_OTP_LIMITS: SendOtpLimits = {
  cooldownSeconds: 60,
  perPhone: { max: 5, windowSeconds: 60 * 60 },
  perIp: { max: 20, windowSeconds: 60 * 60 },
};

/** Kiểm tra cả ba lớp: cooldown/số, tổng/số theo giờ, tổng/IP theo giờ. */
export function checkSendOtp(
  limiter: OtpRateLimiter,
  input: { phoneNumber: string; ip: string },
  limits: SendOtpLimits = DEFAULT_SEND_OTP_LIMITS,
): number | null {
  return (
    limiter.consume(`otp:cooldown:${input.phoneNumber}`, {
      max: 1,
      windowSeconds: limits.cooldownSeconds,
    }) ??
    limiter.consume(`otp:phone:${input.phoneNumber}`, limits.perPhone) ??
    limiter.consume(`otp:ip:${input.ip}`, limits.perIp)
  );
}