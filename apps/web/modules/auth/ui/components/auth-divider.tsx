import { Separator } from "@workspace/ui/components/separator";

export function AuthDivider({ label = "hoặc" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <Separator className="flex-1" />
    </div>
  );
}