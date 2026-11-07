
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const SUPPORTED_DOCUMENT_TYPES = [
  "application/vnd.google-apps.document",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

const MAX_TEXT_LENGTH = 300_000;

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
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new Error(
      "Document contains no extractable text",
    );
  }

  if (normalized.length > MAX_TEXT_LENGTH) {
    throw new Error(
      "Document exceeds maximum text length",
    );
  }

  return normalized;
}

export function chunkDocumentText(
  text: string,
  chunkSize = 1200,
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

  const chunks: string[] = [];

  let offset = 0;

  while (offset < text.length) {
    const end = Math.min(
      offset + chunkSize,
      text.length,
    );

    const content = text.slice(offset, end).trim();

    if (content) {
      chunks.push(content);
    }

    if (end >= text.length) {
      break;
    }

    offset = end - overlap;
  }

  return chunks;
}
