
import Link from "next/link";
import {
  authPath,
  safeAuthRedirect,
} from "@/lib/auth-redirect";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    callbackURL?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const callbackURL = safeAuthRedirect(
    params.callbackURL,
  );

  const success = !params.error;

  return (
    <div className="w-full max-w-md space-y-5 rounded-xl border bg-background p-6 text-center">
      <h1 className="text-2xl font-semibold">
        {success
          ? "Email đã được xác minh"
          : "Không thể xác minh email"}
      </h1>

      <p className="text-sm text-muted-foreground">
        {success
          ? "Email của bạn đã được xác minh. Hãy đăng nhập để tiếp tục."
          : "Liên kết xác minh không hợp lệ hoặc đã hết hạn. Bạn có thể yêu cầu gửi lại email xác minh."}
      </p>

      <Link
        href={
          success
            ? authPath("/sign-in", callbackURL)
            : "/sign-in"
        }
        className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        {success ? "Đăng nhập để tiếp tục" : "Quay lại đăng nhập"}
      </Link>
    </div>
  );
}
