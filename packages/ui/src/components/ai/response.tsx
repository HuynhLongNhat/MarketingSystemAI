"use client";

import type { HTMLAttributes } from "react";
import { memo } from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@workspace/ui/lib/utils";

export type AIResponseProps = HTMLAttributes<HTMLDivElement> & {
  options?: Options;
  children: Options["children"];
};

const components: Options["components"] = {
  ol: ({ children, className, ...props }) => (
    <ol className={cn("my-3 ml-5 list-outside list-decimal space-y-1", className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }) => (
    <li className={cn("py-1", className)} {...props}>
      {children}
    </li>
  ),
  ul: ({ children, className, ...props }) => (
    <ul className={cn("my-3 ml-5 list-outside list-disc space-y-1", className)} {...props}>
      {children}
    </ul>
  ),
  strong: ({ children, className, ...props }) => (
    <span className={cn("font-semibold", className)} {...props}>
      {children}
    </span>
  ),
  a: ({ children, className, ...props }) => (
    <a
      className={cn("font-medium text-primary underline", className)}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ children, className, ...props }) => (
    <h1
      className={cn("mt-8 mb-3 text-2xl font-semibold tracking-tight", className)}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2
      className={cn("mt-7 mb-3 text-xl font-semibold tracking-tight", className)}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3 className={cn("mt-6 mb-2 text-lg font-semibold", className)} {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }) => (
    <h4 className={cn("mt-5 mb-2 text-base font-semibold", className)} {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }) => (
    <h5
      className={cn("mt-6 mb-2 font-semibold text-base", className)}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }) => (
    <h6 className={cn("mt-6 mb-2 font-semibold text-sm", className)} {...props}>
      {children}
    </h6>
  ),
  p: ({ children, className, ...props }) => (
    <p className={cn("my-3 leading-7", className)} {...props}>{children}</p>
  ),
  blockquote: ({ children, className, ...props }) => (
    <blockquote className={cn("my-4 border-l-2 border-primary/50 pl-4 text-muted-foreground", className)} {...props}>{children}</blockquote>
  ),
  hr: ({ className, ...props }) => <hr className={cn("my-6 border-border", className)} {...props} />,
  code: ({ children, className, ...props }) => {
    const block = Boolean(className?.includes("language-"));
    return <code className={cn(block ? "block overflow-x-auto rounded-md bg-muted px-4 py-3 font-mono text-xs leading-6" : "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]", className)} {...props}>{children}</code>;
  },
  pre: ({ children, className, ...props }) => <pre className={cn("my-4 overflow-x-auto rounded-md border bg-muted/50", className)} {...props}>{children}</pre>,
  table: ({ children, className, ...props }) => <div className="my-4 w-full overflow-x-auto"><table className={cn("w-full border-collapse text-sm", className)} {...props}>{children}</table></div>,
  th: ({ children, className, ...props }) => <th className={cn("border bg-muted px-3 py-2 text-left font-medium", className)} {...props}>{children}</th>,
  td: ({ children, className, ...props }) => <td className={cn("border px-3 py-2 align-top", className)} {...props}>{children}</td>,
};

export const AIResponse = memo(
  ({ className, options, children, ...props }: AIResponseProps) => (
    <div
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      {...props}
    >
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        {...options}
      >
        {children}
      </ReactMarkdown>
    </div>
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

AIResponse.displayName = "AIResponse";
