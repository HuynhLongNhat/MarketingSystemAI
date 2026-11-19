import { Body, Controller, Post, UseGuards, BadRequestException, ForbiddenException } from "@nestjs/common";
import { AuthGuard } from "../../auth/auth.guard.js";
import { CurrentContext } from "../../auth/current-context.decorator.js";
import type { RequestContext } from "../../auth/request-context.js";
import { hasPermission } from "../../common/permissions/permissions.js";
import { PERMISSIONS } from "../../common/permissions/permissions.js";
import { AgentsService } from "../../agents/agents.service.js";
import { TasksService } from "../../tasks/tasks.service.js";
import { importExternalPlanSchema } from "../../ceo-planning/ceo-planning.dto.js";
import { CeoPlanningService } from "../../ceo-planning/ceo-planning.service.js";

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: { name?: string; arguments?: Record<string, unknown> } };
const tools = [
  { name: "hades_list_agents", description: "List AI agents in the active organization", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "nova_create_plan", description: "Import a completed external AI plan into Nova for human approval. Does not execute tasks.", inputSchema: { type: "object", properties: { title: { type: "string" }, objective: { type: "string" }, source: { type: "string", enum: ["chatgpt", "gemini", "claude", "other"] }, structuredPlan: { type: "object" } }, required: ["title", "objective", "source", "structuredPlan"], additionalProperties: false } },
  { name: "nova_list_plans", description: "List existing CEO plans and approval states in the active organization", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "nova_get_plan", description: "Read a CEO plan by ID including its structured plan and approval status", inputSchema: { type: "object", properties: { planId: { type: "string", format: "uuid" } }, required: ["planId"], additionalProperties: false } },
  { name: "nova_list_plan_reviews", description: "Read existing strategic reviews of a CEO plan", inputSchema: { type: "object", properties: { planId: { type: "string", format: "uuid" } }, required: ["planId"], additionalProperties: false } },
  { name: "hades_list_tasks", description: "List tasks in the active organization", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "hades_get_task", description: "Get a task by ID", inputSchema: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"], additionalProperties: false } },
  { name: "hades_create_task", description: "Create a task assigned to an AI agent. This may consume provider quota.", inputSchema: { type: "object", properties: { title: { type: "string", maxLength: 200 }, description: { type: "string", maxLength: 12000 }, agentId: { type: "string", format: "uuid" } }, required: ["title", "description", "agentId"], additionalProperties: false } },
] as const;

@Controller("integrations/mcp")
@UseGuards(AuthGuard)
export class HadesMcpController {
  constructor(private readonly agents: AgentsService, private readonly tasks: TasksService, private readonly plans: CeoPlanningService) {}

  @Post()
  async handle(@CurrentContext() ctx: RequestContext, @Body() request: Rpc) {
    if (!request || request.jsonrpc !== "2.0" || typeof request.method !== "string") throw new BadRequestException("Invalid JSON-RPC request");
    const respond = (result: unknown) => ({ jsonrpc: "2.0" as const, id: request.id ?? null, result });
    if (request.method === "notifications/initialized") return undefined;
    if (request.method === "initialize") return respond({ protocolVersion: "2025-03-26", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "hades", version: "0.1.0" } });
    if (request.method === "ping") return respond({});
    if (request.method === "tools/list") {
      if (!hasPermission(ctx.role, PERMISSIONS.AGENT_READ)) throw new ForbiddenException("Agent read permission required");
      return respond({ tools: tools.filter((tool) => !["hades_create_task", "nova_create_plan"].includes(tool.name) || hasPermission(ctx.role, PERMISSIONS.AGENT_MANAGE)) });
    }
    if (request.method !== "tools/call") return { jsonrpc: "2.0", id: request.id ?? null, error: { code: -32601, message: "Method not found" } };
    const name = request.params?.name;
    const args = request.params?.arguments ?? {};
    if (!tools.some((tool) => tool.name === name)) return { jsonrpc: "2.0", id: request.id ?? null, error: { code: -32602, message: "Unknown tool" } };
    if (!hasPermission(ctx.role, ["hades_create_task", "nova_create_plan"].includes(name ?? "") ? PERMISSIONS.AGENT_MANAGE : PERMISSIONS.AGENT_READ)) throw new ForbiddenException("Insufficient permissions");
    let data: unknown;
    if (name === "hades_list_agents") data = await this.agents.list(ctx);
    if (name === "nova_create_plan") {
      const parsed = importExternalPlanSchema.safeParse(args);
      if (!parsed.success) throw new BadRequestException("Invalid external plan. Expected v3.1 structuredPlan.");
      data = await this.plans.importExternal(ctx, parsed.data);
    }
    if (name === "nova_list_plans") data = await this.plans.list(ctx);
    if (name === "nova_get_plan" || name === "nova_list_plan_reviews") {
      if (typeof args.planId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.planId)) throw new BadRequestException("Valid planId required");
      data = name === "nova_get_plan" ? await this.plans.get(ctx, args.planId) : await this.plans.listReviews(ctx, args.planId);
    }
    if (name === "hades_list_tasks") data = await this.tasks.list(ctx, undefined, undefined);
    if (name === "hades_get_task") {
      if (typeof args.taskId !== "string" || !/^[0-9a-f-]{36}$/i.test(args.taskId)) throw new BadRequestException("Valid taskId required");
      data = await this.tasks.get(ctx, args.taskId);
    }
    if (name === "hades_create_task") {
      const { title, description, agentId } = args;
      if (typeof title !== "string" || !title.trim() || title.length > 200 ||
          typeof description !== "string" || !description.trim() || description.length > 12000 ||
          typeof agentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId)) {
        throw new BadRequestException("Invalid task arguments");
      }
      data = await this.tasks.create(ctx, { title: title.trim(), description: description.trim(), agentId });
    }
    return respond({ content: [{ type: "text", text: JSON.stringify(data) }] });
  }
}
