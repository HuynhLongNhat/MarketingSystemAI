import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { PublicWidgetOriginGuard } from "./public-widget-origin.guard.js";

function context(request: Record<string, unknown>) { return { switchToHttp: () => ({ getRequest: () => request }) } as never; }

describe("PublicWidgetOriginGuard", () => {
  it("rejects malformed and missing origins before tenant resolution", async () => {
    const guard = new PublicWidgetOriginGuard();
    await assert.rejects(() => guard.canActivate(context({ headers: {}, method: "GET", path: "/conversations", params: {} })), ForbiddenException);
    await assert.rejects(() => guard.canActivate(context({ headers: { origin: "https://allowed.example/path" }, method: "GET", path: "/conversations", params: {} })), ForbiddenException);
  });
});
