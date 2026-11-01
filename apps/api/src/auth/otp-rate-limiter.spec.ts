import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkSendOtp,
  InMemoryOtpRateLimiter,
  type SendOtpLimits,
} from "./otp-rate-limiter.js";

const limits: SendOtpLimits = {
  cooldownSeconds: 60,
  perPhone: { max: 3, windowSeconds: 3600 },
  perIp: { max: 4, windowSeconds: 3600 },
};

describe("OTP send rate limiting", () => {
  it("blocks a resend during the cooldown and reports the wait", () => {
    let now = 0;
    const limiter = new InMemoryOtpRateLimiter(() => now);
    const input = { phoneNumber: "+84912345678", ip: "1.1.1.1" };

    assert.equal(checkSendOtp(limiter, input, limits), null);

    now = 20_000;
    assert.equal(checkSendOtp(limiter, input, limits), 40);

    now = 61_000;
    assert.equal(checkSendOtp(limiter, input, limits), null);
  });

  it("caps sends per phone number within the window", () => {
    let now = 0;
    const limiter = new InMemoryOtpRateLimiter(() => now);
    const input = { phoneNumber: "+84912345678", ip: "1.1.1.1" };

    for (let i = 0; i < 3; i++) {
      assert.equal(checkSendOtp(limiter, input, limits), null);
      now += 61_000;
    }
    assert.notEqual(checkSendOtp(limiter, input, limits), null);
  });

  it("caps sends per IP across different phone numbers", () => {
    let now = 0;
    const limiter = new InMemoryOtpRateLimiter(() => now);

    for (let i = 0; i < 4; i++) {
      assert.equal(
        checkSendOtp(limiter, { phoneNumber: `+8491234567${i}`, ip: "9.9.9.9" }, limits),
        null,
      );
      now += 1000;
    }
    assert.notEqual(
      checkSendOtp(limiter, { phoneNumber: "+84912345670", ip: "9.9.9.9" }, limits),
      null,
    );
    // IP khác không bị ảnh hưởng.
    assert.equal(
      checkSendOtp(limiter, { phoneNumber: "+84987654321", ip: "8.8.8.8" }, limits),
      null,
    );
  });
});