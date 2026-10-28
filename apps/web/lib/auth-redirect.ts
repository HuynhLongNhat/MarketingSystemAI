
export function safeAuthRedirect(
  value: string | null | undefined,
): string {
  if (!value) return "/org-selection";

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return "/org-selection";
  }

  return value;
}

export function authPath(
  pathname: "/sign-in" | "/sign-up",
  callbackURL: string,
): string {
  return `${pathname}?callbackURL=${encodeURIComponent(
    safeAuthRedirect(callbackURL),
  )}`;
}
