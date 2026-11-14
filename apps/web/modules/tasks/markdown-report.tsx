"use client";

import { AIResponse } from "@workspace/ui/components/ai/response";

type Source = {
  citationNumber: number | null;
  ordinal: number;
  displayUrl: string;
};

function sourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function linkSavedCitations(markdown: string, sources: Source[]) {
  const urls = new Map(sources.flatMap((source) => {
    const url = sourceUrl(source.displayUrl);
    return url ? [[source.citationNumber ?? source.ordinal, url] as const] : [];
  }));
  if (!urls.size) return markdown;
  return markdown.replace(/(?<!\\)\[(\d+)\](?!\()/g, (citation, value: string) => {
    const url = urls.get(Number(value));
    return url ? `[${value}](${url})` : citation;
  });
}

export function MarkdownReport({ content, sources }: { content: string; sources: Source[] }) {
  return <AIResponse className="max-w-none text-sm leading-7 text-foreground">{linkSavedCitations(content, sources)}</AIResponse>;
}
