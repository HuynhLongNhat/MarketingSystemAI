
import { EMBED_CONFIG } from "./config";
import { chatBubbleIcon, closeIcon } from "./icons";

type WidgetPosition = "bottom-right" | "bottom-left";

type WidgetInitOptions = {
  organizationId?: string;
  position?: WidgetPosition;
};

type WidgetWindow = Window & {
  EchoWidget?: {
    init: (options: WidgetInitOptions) => void;
    show: () => void;
    hide: () => void;
    destroy: () => void;
  };
};

(function () {
  const globalWindow = window as WidgetWindow;

  // Một trang chỉ quản lý một Widget instance.
  if (globalWindow.EchoWidget) {
    return;
  }

  const script = document.currentScript as
    | HTMLScriptElement
    | null;

  const scriptUrl = script?.src
    ? new URL(script.src)
    : null;

  const widgetUrl = (
    EMBED_CONFIG.WIDGET_URL ||
    scriptUrl?.origin ||
    window.location.origin
  ).replace(/\/$/, "");

  const widgetOrigin = new URL(widgetUrl).origin;

  let organizationId =
    script?.getAttribute("data-organization-id")?.trim() ||
    null;

  let position: WidgetPosition =
    script?.getAttribute("data-position") === "bottom-left"
      ? "bottom-left"
      : EMBED_CONFIG.DEFAULT_POSITION;

  let iframe: HTMLIFrameElement | null = null;
  let container: HTMLDivElement | null = null;
  let button: HTMLButtonElement | null = null;

  let isOpen = false;
  let destroyed = false;
  let hideTimer: number | null = null;

  function buildWidgetUrl(): string {
    const url = new URL(widgetUrl);

    if (organizationId) {
      url.searchParams.set("organizationId", organizationId);
    }

    return url.toString();
  }

  function clearHideTimer(): void {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function render(): void {
    if (destroyed || button || container) return;

    if (!organizationId) {
      console.error(
        "Echo Widget: data-organization-id attribute is required",
      );
      return;
    }

    button = document.createElement("button");
    button.id = "echo-widget-button";
    button.type = "button";
    button.setAttribute("aria-label", "Mở hỗ trợ khách hàng");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = chatBubbleIcon;

    button.style.cssText = `
      position: fixed;
      ${position === "bottom-left" ? "left: 20px;" : "right: 20px;"}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(59, 130, 246, 0.35);
      transition: transform 0.2s ease;
    `;

    button.addEventListener("click", toggleWidget);

    button.addEventListener("mouseenter", () => {
      if (button) {
        button.style.transform = "scale(1.05)";
      }
    });

    button.addEventListener("mouseleave", () => {
      if (button) {
        button.style.transform = "scale(1)";
      }
    });

    container = document.createElement("div");
    container.id = "echo-widget-container";

    container.style.cssText = `
      position: fixed;
      ${position === "bottom-left" ? "left: 20px;" : "right: 20px;"}
      bottom: 90px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    iframe = document.createElement("iframe");
    iframe.src = buildWidgetUrl();
    iframe.title = "Hỗ trợ khách hàng";
    iframe.setAttribute("loading", "lazy");

    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    `;

    // Giữ quyền microphone cho chức năng voice hiện có.
    iframe.allow =
      "microphone; clipboard-read; clipboard-write";

    container.appendChild(iframe);

    document.body.appendChild(button);
    document.body.appendChild(container);

    window.addEventListener("message", handleMessage);
  }

  function init(): void {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        render,
        { once: true },
      );
    } else {
      render();
    }
  }

  function handleMessage(event: MessageEvent): void {
    if (event.origin !== widgetOrigin) return;
    if (event.source !== iframe?.contentWindow) return;

    if (
      !event.data ||
      typeof event.data !== "object"
    ) {
      return;
    }

    const { type, payload } = event.data;

    switch (type) {
      case "close":
        hide();
        break;

      case "resize": {
        if (!container) break;

        const height = Number(payload?.height);

        if (!Number.isFinite(height) || height <= 0) {
          break;
        }

        const safeHeight = Math.min(
          Math.max(height, 200),
          window.innerHeight - 110,
        );

        container.style.height = `${Math.max(100, safeHeight)}px`;
        break;
      }

      default:
        break;
    }
  }

  function show(): void {
    if (!container || !button || destroyed) return;

    clearHideTimer();

    isOpen = true;

    container.style.display = "block";

    window.requestAnimationFrame(() => {
      if (!container || !isOpen) return;

      container.style.opacity = "1";
      container.style.transform = "translateY(0)";
    });

    button.innerHTML = closeIcon;
    button.setAttribute("aria-label", "Đóng hỗ trợ khách hàng");
    button.setAttribute("aria-expanded", "true");
  }

  function hide(): void {
    if (!container || !button || destroyed) return;

    clearHideTimer();

    isOpen = false;

    container.style.opacity = "0";
    container.style.transform = "translateY(10px)";

    button.innerHTML = chatBubbleIcon;
    button.setAttribute("aria-label", "Mở hỗ trợ khách hàng");
    button.setAttribute("aria-expanded", "false");

    hideTimer = window.setTimeout(() => {
      if (container && !isOpen) {
        container.style.display = "none";
      }
      hideTimer = null;
    }, 300);
  }

  function toggleWidget(): void {
    if (isOpen) {
      hide();
    } else {
      show();
    }
  }

  function destroy(): void {
    destroyed = true;
    clearHideTimer();

    document.removeEventListener(
      "DOMContentLoaded",
      render,
    );
    window.removeEventListener("message", handleMessage);

    button?.remove();
    container?.remove();

    button = null;
    container = null;
    iframe = null;
    isOpen = false;

    delete globalWindow.EchoWidget;
  }

  function reinit(options: WidgetInitOptions = {}): void {
    const nextOrganizationId =
      options.organizationId?.trim() || organizationId;

    if (!nextOrganizationId) {
      console.error(
        "Echo Widget: organizationId is required",
      );
      return;
    }

    const nextPosition =
      options.position === "bottom-left"
        ? "bottom-left"
        : "bottom-right";

    clearHideTimer();

    document.removeEventListener(
      "DOMContentLoaded",
      render,
    );
    window.removeEventListener("message", handleMessage);

    button?.remove();
    container?.remove();

    button = null;
    container = null;
    iframe = null;
    isOpen = false;
    destroyed = false;

    organizationId = nextOrganizationId;
    position = options.position ? nextPosition : position;

    init();
  }

  globalWindow.EchoWidget = {
    init: reinit,
    show,
    hide,
    destroy,
  };

  init();
})();
