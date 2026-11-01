export type Country = {
  /** ISO 3166-1 alpha-2 */
  code: string;
  name: string;
  /** Mã quốc gia không có dấu +, ví dụ "84" */
  dialCode: string;
};

export const DEFAULT_COUNTRY_CODE = "VN";

export const COUNTRIES: Country[] = [
  { code: "VN", name: "Việt Nam", dialCode: "84" },
  { code: "US", name: "Hoa Kỳ / Canada", dialCode: "1" },
  { code: "GB", name: "Vương quốc Anh", dialCode: "44" },
  { code: "SG", name: "Singapore", dialCode: "65" },
  { code: "TH", name: "Thái Lan", dialCode: "66" },
  { code: "ID", name: "Indonesia", dialCode: "62" },
  { code: "MY", name: "Malaysia", dialCode: "60" },
  { code: "PH", name: "Philippines", dialCode: "63" },
  { code: "JP", name: "Nhật Bản", dialCode: "81" },
  { code: "KR", name: "Hàn Quốc", dialCode: "82" },
  { code: "CN", name: "Trung Quốc", dialCode: "86" },
  { code: "IN", name: "Ấn Độ", dialCode: "91" },
  { code: "AU", name: "Úc", dialCode: "61" },
  { code: "DE", name: "Đức", dialCode: "49" },
  { code: "FR", name: "Pháp", dialCode: "33" },
];

export function getCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]!;
}

export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export type PhoneParseResult =
  | { ok: true; e164: string }
  | { ok: false; message: string };

/**
 * Chuẩn hóa số nhập tay sang E.164 để gửi lên server.
 * Đây chỉ là kiểm tra phía client để báo lỗi sớm; server luôn kiểm tra lại.
 */
export function toE164(country: Country, input: string): PhoneParseResult {
  const digits = input.replace(/[\s().-]/g, "");

  if (digits.length === 0) {
    return { ok: false, message: "Vui lòng nhập số điện thoại." };
  }
  if (!/^\d+$/.test(digits)) {
    return { ok: false, message: "Số điện thoại chỉ gồm chữ số." };
  }

  // Bỏ số 0 đầu (trunk prefix) khi người dùng nhập dạng nội địa: 0912... -> 912...
  const national = digits.replace(/^0+/, "");

  if (country.code === "VN" && !/^[35789]\d{8}$/.test(national)) {
    return {
      ok: false,
      message: "Số điện thoại Việt Nam không hợp lệ (ví dụ: 0912 345 678).",
    };
  }

  const e164 = `+${country.dialCode}${national}`;

  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    return { ok: false, message: "Số điện thoại không hợp lệ." };
  }

  return { ok: true, e164 };
}

/** Che bớt số khi hiển thị: +84 912 *** 678 */
export function maskPhone(e164: string): string {
  if (e164.length <= 7) return e164;
  return `${e164.slice(0, 5)}${"•".repeat(e164.length - 8)}${e164.slice(-3)}`;
}