
import Link from "next/link";

import {
  ArrowRightIcon,
  BotIcon,
  Building2Icon,
  CheckCircle2Icon,
  CircleDashedIcon,
  HeadsetIcon,
  InboxIcon,
  LibraryBigIcon,
  NetworkIcon,
  Settings2Icon,
  WorkflowIcon,
} from "lucide-react";

type ModuleStatus = "available" | "planned";

type CompanyModule = {
  title: string;
  description: string;
  href: string;
  status: ModuleStatus;
  icon: typeof BotIcon;
};

const companyModules: CompanyModule[] = [
  {
    title: "AI Workforce",
    description:
      "Quản lý nhân viên AI, vai trò, model và quyền truy cập.",
    href: "#ai-workforce",
    status: "planned",
    icon: BotIcon,
  },
  {
    title: "Departments",
    description:
      "Tổ chức đội ngũ theo các phòng ban Marketing, Sales và Support.",
    href: "#departments",
    status: "planned",
    icon: NetworkIcon,
  },
  {
    title: "AI Office",
    description:
      "Quan sát trực quan trạng thái làm việc của từng nhân viên AI.",
    href: "#ai-office",
    status: "planned",
    icon: Building2Icon,
  },
  {
    title: "Tasks & Workflows",
    description:
      "Giao nhiệm vụ, điều phối quy trình và theo dõi execution.",
    href: "#operations",
    status: "planned",
    icon: WorkflowIcon,
  },
];

const availableModules: CompanyModule[] = [
  {
    title: "Customer Conversations",
    description:
      "Quản lý hội thoại và hoạt động chăm sóc khách hàng.",
    href: "/conversations",
    status: "available",
    icon: InboxIcon,
  },
  {
    title: "Knowledge Base",
    description:
      "Quản lý nguồn kiến thức phục vụ chatbot.",
    href: "/files",
    status: "available",
    icon: LibraryBigIcon,
  },
  {
    title: "AI Providers & Models",
    description:
      "Cấu hình kết nối AI, API keys và model mặc định.",
    href: "/settings/ai-providers",
    status: "available",
    icon: Settings2Icon,
  },
];

function ModuleCard({
  module,
}: {
  module: CompanyModule;
}) {
  const Icon = module.icon;
  const available = module.status === "available";

  return (
    <Link
      href={module.href}
      className="group flex h-full flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5" />
        </div>

        {available ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-3.5" />
            Có sẵn
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CircleDashedIcon className="size-3.5" />
            Kế hoạch
          </span>
        )}
      </div>

      <h3 className="font-semibold">
        {module.title}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
        {module.description}
      </p>

      <div className="mt-5 flex items-center gap-1 text-sm font-medium text-primary">
        {available ? "Mở module" : "Xem kế hoạch"}
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function CompanyOverviewPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-10 px-5 py-8 md:px-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2Icon className="size-4" />
            Company Workspace
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Company Overview
          </h1>

          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Trung tâm điều hành công ty marketing AI.
            Quản lý đội ngũ nhân viên, phòng ban,
            công việc và các hoạt động chăm sóc
            khách hàng trong cùng một workspace.
          </p>
        </header>

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <HeadsetIcon className="size-4" />
                Existing capability
              </div>

              <h2 className="text-xl font-semibold">
                Customer Support
              </h2>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Hệ thống chăm sóc khách hàng hiện có
                tiếp tục hoạt động. Trong kiến trúc mới,
                đây sẽ là một bộ phận của AI Company,
                không còn là toàn bộ sản phẩm.
              </p>
            </div>

            <Link
              href="/conversations"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Mở Customer Support
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">
              Modules đang có
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các trang có thể truy cập trong hệ thống hiện tại.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {availableModules.map((module) => (
              <ModuleCard
                key={module.title}
                module={module}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">
              AI Company Roadmap
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các module sẽ được triển khai và kết nối
              dữ liệu thật theo từng task.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {companyModules.map((module) => (
              <div
                key={module.title}
                id={module.href.slice(1)}
                className="scroll-mt-8"
              >
                <ModuleCard module={module} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-dashed p-5">
          <h2 className="font-semibold">
            Nguyên tắc dữ liệu
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Dashboard hiện chưa hiển thị số lượng
            nhân viên AI, nhiệm vụ đang chạy hoặc
            chi phí token vì các chỉ số này chưa
            được kết nối với API tổng hợp dữ liệu.
            Khi triển khai Workforce và Execution,
            các chỉ số sẽ lấy trực tiếp từ backend
            theo organization.
          </p>
        </section>
      </div>
    </div>
  );
}
