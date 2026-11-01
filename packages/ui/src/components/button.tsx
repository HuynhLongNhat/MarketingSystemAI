
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@workspace/ui/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "whitespace-nowrap rounded-md text-sm font-medium",
    "transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
    "outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring/50",
    "aria-invalid:border-destructive",
    "aria-invalid:ring-destructive/20",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-zinc-950 text-white shadow-xs " +
          "hover:bg-zinc-800 " +
          "dark:bg-white dark:text-zinc-950 " +
          "dark:hover:bg-zinc-200",

        destructive:
          "bg-red-600 text-white shadow-xs " +
          "hover:bg-red-700 " +
          "focus-visible:ring-red-500/40 " +
          "dark:bg-red-600 dark:hover:bg-red-700",

        outline:
          "border border-border bg-background text-foreground shadow-xs " +
          "hover:bg-zinc-100 hover:text-zinc-950 " +
          "dark:hover:bg-zinc-800 dark:hover:text-white",

        secondary:
          "bg-zinc-950 text-white shadow-xs " +
          "hover:bg-zinc-800 " +
          "dark:bg-white dark:text-zinc-950 " +
          "dark:hover:bg-zinc-200",

        ghost:
          "text-foreground hover:bg-zinc-100 " +
          "dark:hover:bg-zinc-800",

        link:
          "text-foreground underline-offset-4 hover:underline",

        transparent:
          "bg-transparent text-foreground " +
          "hover:bg-zinc-100 dark:hover:bg-zinc-800",

        tertiary:
          "bg-zinc-950 text-white shadow-xs " +
          "hover:bg-zinc-800 " +
          "dark:bg-white dark:text-zinc-950 " +
          "dark:hover:bg-zinc-200",

        warning:
          "bg-zinc-950 text-white shadow-xs " +
          "hover:bg-zinc-800 " +
          "dark:bg-white dark:text-zinc-950 " +
          "dark:hover:bg-zinc-200",

        // Edit: giữ nền và viền, hover chỉ đổi icon vàng.
        edit:
          "border border-border bg-background text-foreground shadow-xs " +
          "hover:bg-background hover:border-border " +
          "hover:text-yellow-500 " +
          "dark:bg-input/30 dark:border-input " +
          "dark:hover:bg-input/30 dark:hover:border-input " +
          "dark:hover:text-yellow-400",

        // Delete: giữ nền và viền, hover chỉ đổi icon đỏ.
        delete:
          "border border-border bg-background text-foreground shadow-xs " +
          "hover:bg-background hover:border-border " +
          "hover:text-red-600 " +
          "dark:bg-input/30 dark:border-input " +
          "dark:hover:bg-input/30 dark:hover:border-input " +
          "dark:hover:text-red-400",
      },

      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({
          variant,
          size,
          className,
        }),
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };
