
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

import {
  MAX_DOCUMENT_TEXT_LENGTH,
} from "./knowledge-ingestion-limits.js";

export const SUPPORTED_DOCUMENT_TYPES = [
  "application/vnd.google-apps.document",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export async function extractDocumentText(
  mimeType: string,
  data: Buffer,
): Promise<string> {
  let text: string;

  switch (mimeType) {
    case "application/vnd.google-apps.document":
    case "text/plain":
    case "text/markdown":
      text = data.toString("utf8");
      break;

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const result = await mammoth.extractRawText({
        buffer: data,
      });

      text = result.value;
      break;
    }

    case "application/pdf": {
      const parser = new PDFParse({
        data: new Uint8Array(data),
      });

      try {
        const result = await parser.getText();
        text = result.text;
      } finally {
        await parser.destroy();
      }

      break;
    }

    default:
      throw new Error("Unsupported document MIME type");
  }

  const normalized = text
    .replace(/\r\n?/g, "\n")
    // Mammoth emits DOCX table cells as tab-separated text. Preserve the
    // boundary so a service name remains associated with its price/terms.
    .replace(/\t+/g, " | ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new Error(
      "Document contains no extractable text",
    );
  }

  if (normalized.length > MAX_DOCUMENT_TEXT_LENGTH) {
    throw new Error(
      "Document exceeds maximum text length",
    );
  }

  return normalized;
}

export function chunkDocumentText(
  text: string,
  chunkSize = 1400,
  overlap = 180,
): string[] {
  if (
    !Number.isInteger(chunkSize) ||
    !Number.isInteger(overlap) ||
    chunkSize <= 0 ||
    overlap < 0 ||
    overlap >= chunkSize
  ) {
    throw new Error("Invalid chunk configuration");
  }

  const units = documentUnits(text);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;
  let heading: string | null = null;

  const flush = () => {
    const content = current.join("\n\n").trim();
    if (content) chunks.push(content);
    current = [];
    currentLength = 0;
  };

  for (const unit of units) {
    if (isHeading(unit)) {
      flush();
      heading = unit;
      current = [unit];
      currentLength = unit.length;
      continue;
    }

    for (const part of splitOversizedUnit(unit, chunkSize)) {
      const separator = current.length > 0 ? 2 : 0;
      if (currentLength + separator + part.length > chunkSize && current.length > 0) {
        const tail = overlap > 0 ? trailingContext(current, overlap) : [];
        flush();
        if (heading && !tail.includes(heading)) {
          current.push(heading);
          currentLength += heading.length;
        }
        for (const previous of tail) {
          const join = current.length > 0 ? 2 : 0;
          if (currentLength + join + previous.length <= chunkSize) {
            current.push(previous);
            currentLength += join + previous.length;
          }
        }
      }
      const join = current.length > 0 ? 2 : 0;
      current.push(part);
      currentLength += join + part.length;
    }
  }

  flush();
  return chunks;
}

function documentUnits(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .flatMap((paragraph) => {
      const value = paragraph.trim();
      if (!value) return [];
      // Keep table/list rows together. For prose, paragraph remains the unit.
      return [value];
    });
}

function isHeading(value: string): boolean {
  const lineCount = value.split("\n").length;
  if (lineCount !== 1 || value.length > 120 || value.includes(" | ")) return false;
  return /^(\d+(\.\d+)*[.)-]?\s+)?[A-ZÀ-Ỹ0-9][A-ZÀ-Ỹ0-9 &/:-]{3,}$/.test(value.trim());
}

function splitOversizedUnit(value: string, chunkSize: number): string[] {
  if (value.length <= chunkSize) return [value];
  const sentences = value.match(/[^.!?\n]+[.!?]?/g) ?? [value];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const next = `${current}${current ? " " : ""}${sentence.trim()}`.trim();
    if (next.length > chunkSize && current) {
      parts.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function trailingContext(units: string[], maximumCharacters: number): string[] {
  const result: string[] = [];
  let size = 0;
  for (let index = units.length - 1; index >= 0; index -= 1) {
    const unit = units[index] as string;
    if (size + unit.length > maximumCharacters) break;
    result.unshift(unit);
    size += unit.length + 2;
  }
  return result;
}
