import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isTempPhoneEmail,
  isValidE164,
  isValidPhoneNumber,
  tempEmailForPhone,
} from "./phone-number.js";

describe("Phone number validation", () => {
  it("accepts well-formed E.164 numbers", () => {
    assert.equal(isValidE164("+84912345678"), true);
    assert.equal(isValidE164("+14155552671"), true);
  });

  it("rejects local, spaced or malformed numbers", () => {
    for (const value of ["0912345678", "+84 912 345 678", "84912345678", "+0123456789", "+1234", "", null, 123]) {
      assert.equal(isValidE164(value), false, String(value));
    }
  });

  it("applies Vietnamese mobile prefix rules to +84 numbers", () => {
    assert.equal(isValidPhoneNumber("+84912345678"), true);
    assert.equal(isValidPhoneNumber("+84212345678"), false);
    assert.equal(isValidPhoneNumber("+8491234567"), false);
  });

  it("builds a recognisable placeholder email for phone-only users", () => {
    const email = tempEmailForPhone("+84912345678");
    assert.equal(email, "84912345678@phone-user.invalid");
    assert.equal(isTempPhoneEmail(email), true);
    assert.equal(isTempPhoneEmail("user@example.com"), false);
  });
});