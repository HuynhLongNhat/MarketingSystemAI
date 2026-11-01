import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/** Khung chung cho mọi màn hình auth: tiêu đề, nội dung và dòng chuyển trang ở cuối. */
export function AuthCard({ title, description, children, footer }: Props) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </header>

      {children}

      {footer && (
        <p className="text-center text-sm text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}