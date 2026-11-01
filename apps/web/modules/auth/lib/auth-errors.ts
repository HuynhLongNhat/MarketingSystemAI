type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
} | null;

const MESSAGES: Record<string, string> = {
  // Email / password
  INVALID_EMAIL_OR_PASSWORD: "Email hoặc mật khẩu không đúng.",
  EMAIL_NOT_VERIFIED: "Email chưa được xác minh. Hãy kiểm tra hộp thư của bạn.",
  USER_ALREADY_EXISTS: "Email này đã được đăng ký.",
  // Phone / OTP
  INVALID_PHONE_NUMBER: "Số điện thoại không hợp lệ.",
  PHONE_NUMBER_EXIST: "Số điện thoại này đã gắn với một tài khoản khác.",
  OTP_EXPIRED: "Mã OTP đã hết hạn. Hãy yêu cầu mã mới.",
  OTP_NOT_FOUND: "Mã OTP đã hết hạn hoặc chưa được gửi. Hãy yêu cầu mã mới.",
  INVALID_OTP: "Mã OTP không đúng.",
  TOO_MANY_ATTEMPTS: "Bạn đã nhập sai quá nhiều lần. Hãy yêu cầu mã mới.",
  // Social / OAuth (giá trị của query ?error= khi callback thất bại)
  access_denied: "Bạn đã hủy đăng nhập.",
  user_cancelled_authorize: "Bạn đã hủy đăng nhập.",
  state_mismatch: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
  please_restart_the_process: "Phiên đăng nhập đã hết hạn. Vui lòng thử lại.",
  invalid_code: "Không thể xác thực với nhà cung cấp. Vui lòng thử lại.",
  no_code: "Không thể xác thực với nhà cung cấp. Vui lòng thử lại.",
  unable_to_get_user_info: "Không lấy được thông tin tài khoản từ nhà cung cấp.",
  email_not_found: "Nhà cung cấp không trả về email. Hãy dùng phương thức khác.",
  account_not_linked:
    "Email này đã có tài khoản. Hãy đăng nhập bằng phương thức cũ, rồi liên kết trong phần cài đặt.",
  unable_to_link_account: "Không thể liên kết tài khoản. Vui lòng thử lại.",
  oauth_provider_not_found: "Phương thức đăng nhập này chưa được cấu hình.",
  PROVIDER_NOT_FOUND: "Phương thức đăng nhập này chưa được cấu hình.",
  signup_disabled: "Đăng ký tài khoản mới đang bị tắt.",
};

export function getAuthErrorMessage(
  error: AuthErrorLike | undefined,
  fallback = "Đã xảy ra lỗi. Vui lòng thử lại.",
): string {
  if (!error) return fallback;
  if (error.status === 429) {
    return "Bạn thao tác quá nhanh. Vui lòng đợi một lúc rồi thử lại.";
  }
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!;
  return error.message || fallback;
}

/** Dành cho giá trị ?error= trên URL sau OAuth callback. */
export function getCallbackErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? "Đăng nhập không thành công. Vui lòng thử lại.";
}