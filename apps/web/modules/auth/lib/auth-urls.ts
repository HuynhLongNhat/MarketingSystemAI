import { safeAuthRedirect } from "@/lib/auth-redirect";

/**
 * API chạy ở origin khác frontend, nên callback gửi cho Better Auth phải là URL tuyệt đối.
 * Path luôn đi qua safeAuthRedirect; Better Auth tiếp tục kiểm tra với trustedOrigins.
 */
export function toAbsoluteUrl(path: string): string {
  return new URL(safeAuthRedirect(path), window.location.origin).toString();
}

export function buildErrorCallbackUrl(
  pathname: "/sign-in" | "/sign-up",
  callbackURL: string,
): string {
  const url = new URL(pathname, window.location.origin);
  url.searchParams.set("callbackURL", safeAuthRedirect(callbackURL));
  return url.toString();
}