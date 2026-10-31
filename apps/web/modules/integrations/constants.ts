
export const INTEGRATIONS = [
  {
    id: "html",
    title: "HTML",
    icon: "/languages/html5.svg",
  },
  {
    id: "react",
    title: "React",
    icon: "/languages/react.svg",
  },
  {
    id: "nextjs",
    title: "Next.js",
    icon: "/languages/nextjs.svg",
  },
  {
    id: "javascript",
    title: "JavaScript",
    icon: "/languages/javascript.svg",
  },
] as const;

export type IntegrationId =
  (typeof INTEGRATIONS)[number]["id"];

// Local: http://localhost:3001
// Production: URL public của ứng dụng Widget.
export const WIDGET_BASE_URL = (
  process.env.NEXT_PUBLIC_WIDGET_URL ||
  "http://localhost:3001"
).replace(/\/+$/, "");

export const WIDGET_SCRIPT_URL =
  `${WIDGET_BASE_URL}/widget.js`;
