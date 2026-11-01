const E164 = /^\+[1-9]\d{7,14}$/;

export function isValidE164(value: unknown): value is string {
  return typeof value === "string" && E164.test(value);
}

/** Số Việt Nam: +84 và đầu số 3/5/7/8/9 theo sau 8 chữ số. */
export function isValidPhoneNumber(value: unknown): value is string {
  if (!isValidE164(value)) return false;
  if (value.startsWith("+84")) return /^\+84[35789]\d{8}$/.test(value);
  return true;
}

/** Email tạm cho user chỉ có số điện thoại (cột email là NOT NULL + unique). */
export function tempEmailForPhone(phoneNumber: string): string {
  return `${phoneNumber.replace("+", "")}@phone-user.invalid`;
}

export function isTempPhoneEmail(email: string): boolean {
  return email.endsWith("@phone-user.invalid");
}