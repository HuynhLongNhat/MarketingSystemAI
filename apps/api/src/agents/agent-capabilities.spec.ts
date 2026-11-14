import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { normalizeAgentCapabilities } from "./agent-capabilities.js";

describe("Agent capability allowlist", () => {
  it("allows web_research only when an AGENT_MANAGE API mutation persists it", () => {
    assert.deepEqual(normalizeAgentCapabilities(["web_research", "web_research"]), ["web_research"]);
  });
  it("rejects client supplied unknown capabilities", () => {
    assert.throws(() => normalizeAgentCapabilities(["web_research", "admin_override"]), BadRequestException);
  });
});
