import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

type Props = ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: string;
};

/** Nút hành động chính của màn hình auth: nền đen/trắng theo theme. */
export function AuthSubmitButton({
  loading = false,
  loadingText,
  disabled,
  className,
  children,
  ...props
}: Props) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={disabled || loading}
      className={cn(
        "w-full bg-foreground text-background hover:bg-foreground/90",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}