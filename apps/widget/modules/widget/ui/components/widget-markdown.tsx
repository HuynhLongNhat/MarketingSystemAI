import type { ReactNode } from "react";

type InlinePart = { type: "text" | "bold" | "italic" | "code" | "link"; value: string; href?: string };

const inlinePattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g;

function safeHref(value: string): string | null {
  try {
    const url = new URL(value, "https://widget.invalid");
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return value;
    }
  } catch {
    // Render an invalid URL as ordinary text.
  }
  return null;
}

function inlineParts(value: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let cursor = 0;

  for (const match of value.matchAll(inlinePattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ type: "text", value: value.slice(cursor, index) });
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push({ type: "bold", value: token.slice(2, -2) });
    } else if (token.startsWith("*")) {
      parts.push({ type: "italic", value: token.slice(1, -1) });
    } else if (token.startsWith("`")) {
      parts.push({ type: "code", value: token.slice(1, -1) });
    } else {
      const link = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(token);
      parts.push(link ? { type: "link", value: link[1] ?? token, href: link[2] } : { type: "text", value: token });
    }
    cursor = index + token.length;
  }
  if (cursor < value.length) parts.push({ type: "text", value: value.slice(cursor) });
  return parts;
}

function InlineMarkdown({ value }: { value: string }) {
  return <>{inlineParts(value).map((part, index) => {
    const key = `${part.type}-${index}`;
    if (part.type === "bold") return <strong key={key} className="font-semibold">{part.value}</strong>;
    if (part.type === "italic") return <em key={key}>{part.value}</em>;
    if (part.type === "code") return <code key={key} className="rounded bg-black/[0.08] px-1.5 py-0.5 font-mono text-[0.85em]">{part.value}</code>;
    if (part.type === "link") {
      const href = safeHref(part.href ?? "");
      return href ? <a key={key} href={href} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2 hover:opacity-75">{part.value}</a> : <span key={key}>{part.value}</span>;
    }
    return <span key={key}>{part.value}</span>;
  })}</>;
}

/** A deliberately small, React-only Markdown renderer for untrusted AI text. */
export function WidgetMarkdown({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!line) {
      index += 1;
      continue;
    }
    const unordered = /^[-*+]\s+(.+)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const list: string[] = [];
      const orderedList = Boolean(ordered);
      while (index < lines.length) {
        const item = orderedList
          ? /^\d+[.)]\s+(.+)$/.exec(lines[index] ?? "")
          : /^[-*+]\s+(.+)$/.exec(lines[index] ?? "");
        if (!item) break;
        list.push(item[1] ?? "");
        index += 1;
      }
      const Tag = orderedList ? "ol" : "ul";
      blocks.push(<Tag key={`list-${index}`} className={orderedList ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>{list.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown value={item} /></li>)}</Tag>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim()) {
      paragraph.push(lines[index] ?? "");
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}><InlineMarkdown value={paragraph.join("\n")} /></p>);
  }
  return <div className="space-y-2 whitespace-pre-wrap break-words">{blocks}</div>;
}
