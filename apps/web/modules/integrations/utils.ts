
import {
  type IntegrationId,
  WIDGET_SCRIPT_URL,
} from "./constants";

const escapeHtmlAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const createScript = (
  integrationId: IntegrationId,
  organizationId: string,
): string => {
  const id = organizationId.trim();

  if (!id) {
    return "";
  }

  const safeId = escapeHtmlAttribute(id);
  const safeSrc = escapeHtmlAttribute(
    WIDGET_SCRIPT_URL,
  );

  switch (integrationId) {
    case "html":
      return `<script
  src="${safeSrc}"
  data-organization-id="${safeId}"
  defer
></script>`;

    case "react":
      return `// Thêm vào index.html, trước thẻ đóng </body>.
// Áp dụng cho website React sử dụng Vite.

<script
  src="${safeSrc}"
  data-organization-id="${safeId}"
  defer
></script>`;

    case "nextjs":
      return `// app/layout.tsx
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {children}

        <Script
          src=${JSON.stringify(WIDGET_SCRIPT_URL)}
          data-organization-id=${JSON.stringify(id)}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`;

    case "javascript":
      return `// Thêm vào file JavaScript chạy trên trình duyệt.

const script = document.createElement("script");

script.src = ${JSON.stringify(WIDGET_SCRIPT_URL)};
script.dataset.organizationId = ${JSON.stringify(id)};
script.async = true;

document.body.appendChild(script);`;

    default:
      return "";
  }
};
