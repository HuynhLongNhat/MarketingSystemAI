import type { LucideIcon } from "lucide-react";

type CrmEmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  details: string;
};

export const CrmEmptyState = ({
  eyebrow,
  title,
  description,
  icon: Icon,
  details,
}: CrmEmptyStateProps) => (
  <div className="mx-auto flex min-h-[calc(100vh-14rem)] w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
    <section className="rounded-2xl border bg-card p-6 sm:p-9">
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-6 text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-7 rounded-xl border border-dashed bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        {details}
      </div>
    </section>
  </div>
);
