import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Inbox,
  LibraryBig,
  Settings2,
} from "lucide-react";

const actions = [
  {
    title: "Inbox hỗ trợ",
    description: "Xử lý các hội thoại đang cần nhân viên tiếp quản.",
    href: "/conversations",
    icon: Inbox,
  },
  {
    title: "Knowledge Base",
    description: "Quản lý FAQ, nguồn tài liệu và trạng thái lập chỉ mục.",
    href: "/files",
    icon: LibraryBig,
  },
  {
    title: "AI Providers & Models",
    description: "Thiết lập model chat và embedding riêng cho workspace.",
    href: "/settings/ai-providers",
    icon: Settings2,
  },
];

export default function CompanyOverviewPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-7 sm:px-6 lg:px-8">
        <header className="rounded-2xl border bg-card px-6 py-7 sm:px-8">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </div>
          <p className="mt-5 text-sm font-medium text-muted-foreground">AI Company Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tổng quan vận hành</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Customer Support là sản phẩm đang hoạt động. Các chỉ số vận hành sẽ chỉ được hiển thị khi API cung cấp dữ liệu đã xác minh.
          </p>
        </header>

        <section aria-labelledby="quick-actions" className="space-y-4">
          <div>
            <h2 id="quick-actions" className="text-lg font-semibold">Tiếp tục công việc</h2>
            <p className="mt-1 text-sm text-muted-foreground">Truy cập nhanh các khu vực đang kết nối với dữ liệu thật.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30">
                <action.icon className="size-5" />
                <h3 className="mt-5 font-semibold">{action.title}</h3>
                <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">{action.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium">Mở khu vực <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Không hiển thị số liệu mẫu. Khi hệ thống có API tổng quan cho hội thoại, agents và Knowledge Base, các chỉ số đã xác minh sẽ được bổ sung tại đây.
        </section>
      </div>
    </div>
  );
}
