"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

export default function AuthTestPage() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const {
    data: session,
    isPending,
    error: sessionError,
    refetch,
  } = authClient.useSession();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setMessage("");
    setIsError(false);

    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
            });

      if (result.error) {
        setIsError(true);
        setMessage(result.error.message || "Authentication failed.");
        return;
      }

      await refetch();

      setMessage(
        mode === "sign-up"
          ? "Đăng ký thành công."
          : "Đăng nhập thành công.",
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi không xác định.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setIsError(true);
        setMessage(result.error.message || "Đăng xuất thất bại.");
        return;
      }

      await refetch();
      setMessage("Đăng xuất thành công.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi đăng xuất.",
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">
            Better Auth Test
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Trang thử nghiệm độc lập, chưa thay thế Clerk.
          </p>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("sign-in");
                setMessage("");
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                mode === "sign-in"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Đăng nhập
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("sign-up");
                setMessage("");
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                mode === "sign-up"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "sign-up" && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium"
                >
                  Tên
                </label>

                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className={inputClass}
                  placeholder="Tên của bạn"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium"
              >
                Mật khẩu
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "sign-in"
                    ? "current-password"
                    : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className={inputClass}
                placeholder="Ít nhất 8 ký tự"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "Đang xử lý..."
                : mode === "sign-in"
                  ? "Đăng nhập"
                  : "Tạo tài khoản"}
            </button>
          </form>

          {message && (
            <p
              role={isError ? "alert" : "status"}
              className={`mt-4 rounded-md p-3 text-sm ${
                isError
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {message}
            </p>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Session hiện tại</h2>

          <p className="mt-2 text-sm text-gray-500">
            Trạng thái phiên đăng nhập được lấy từ Better Auth.
          </p>

          <div className="mt-4 rounded-md bg-gray-100 p-3 text-sm">
            {isPending
              ? "Đang kiểm tra session..."
              : sessionError
                ? `Lỗi lấy session: ${sessionError.message}`
                : session
                  ? "Đã đăng nhập"
                  : "Chưa đăng nhập"}
          </div>

          {session?.user && (
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Tên:</span>{" "}
                {session.user.name}
              </p>

              <p>
                <span className="font-medium">Email:</span>{" "}
                {session.user.email}
              </p>

              <p className="break-all">
                <span className="font-medium">User ID:</span>{" "}
                {session.user.id}
              </p>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                className="mt-3 rounded-md border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-60"
              >
                Đăng xuất
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isPending || busy}
            className="mt-5 block text-sm text-blue-600 hover:underline disabled:opacity-60"
          >
            Làm mới session
          </button>
        </section>
      </div>
    </main>
  );
}