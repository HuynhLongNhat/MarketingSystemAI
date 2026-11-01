import Image from "next/image";
import { ThemeToggle } from "../components/theme-toggle";


export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid min-h-svh w-full lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Panel thương hiệu: luôn tối ở cả hai theme, chỉ hiện từ màn hình lớn */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-50 lg:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="relative flex items-center gap-2.5 text-sm font-medium">
          <Image src="/logo.svg" alt="" width={28} height={28} priority />
          CompanyMarketingSystem
        </div>

        <div className="relative max-w-md space-y-3">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Mọi cuộc trò chuyện với khách hàng, trong một không gian làm việc.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            Quản lý hội thoại, kho kiến thức và nhân sự AI riêng cho từng tổ chức
            của bạn.
          </p>
        </div>
      </aside>

      <main className="relative flex flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="absolute right-4 top-4 flex items-center gap-3 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        <div className="mb-8 flex items-center gap-2.5 text-sm font-medium lg:hidden">
          <Image src="/logo.svg" alt="" width={24} height={24} />
          CompanyMarketingSystem
        </div>

        {children}
      </main>
    </div>
  );
};