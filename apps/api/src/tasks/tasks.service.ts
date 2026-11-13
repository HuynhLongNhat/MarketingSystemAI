import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { aiAgents, aiModelDefaults, aiProviderConnections, aiTaskEvents, aiTasks, db } from "@workspace/db/node";
import type { RequestContext } from "../auth/request-context.js";
import { JobsService } from "../jobs/jobs.service.js";
import type { CreateTaskDto } from "./tasks.dto.js";

const QUEUE_CLAIM_TIMEOUT_MS = 120_000;

@Injectable()
export class TasksService {
  constructor(private readonly jobs: JobsService) {}

  private queueLeaseExpiresAt() { return new Date(Date.now() + QUEUE_CLAIM_TIMEOUT_MS); }
  private async event(taskId: string, organizationId: string, type: string, message: string) {
    await db.insert(aiTaskEvents).values({ id: randomUUID(), taskId, organizationId, type, message });
  }

  async create(ctx: RequestContext, dto: CreateTaskDto) {
    const title = dto.title.trim(), description = dto.description.trim();
    if (!title || !description) throw new BadRequestException("Task title and description are required");
    let connectionId: string, modelId: string;
    let agentSnapshot: Pick<typeof aiTasks.$inferInsert, "agentId" | "agentName" | "agentRole" | "agentSystemPrompt" | "agentConnectionId" | "agentModelId"> = {};
    if (dto.agentId) {
      const [agent] = await db.select().from(aiAgents).where(and(eq(aiAgents.id, dto.agentId), eq(aiAgents.organizationId, ctx.organizationId))).limit(1);
      if (!agent) throw new BadRequestException("Selected AI agent does not belong to this organization");
      if (agent.status !== "active") throw new BadRequestException("Selected AI agent is not active");
      if (!agent.connectionId || !agent.modelId) throw new BadRequestException("Selected AI agent must have its own provider connection and model");
      const [connection] = await db.select({ id: aiProviderConnections.id }).from(aiProviderConnections).where(and(eq(aiProviderConnections.organizationId, ctx.organizationId), eq(aiProviderConnections.id, agent.connectionId), eq(aiProviderConnections.enabled, true))).limit(1);
      if (!connection) throw new BadRequestException("Selected AI agent provider connection is unavailable");
      connectionId = agent.connectionId;
      modelId = agent.modelId;
      agentSnapshot = { agentId: agent.id, agentName: agent.name, agentRole: agent.role, agentSystemPrompt: agent.systemPrompt, agentConnectionId: agent.connectionId, agentModelId: agent.modelId };
    } else {
      const [model] = await db.select().from(aiModelDefaults).where(and(eq(aiModelDefaults.organizationId, ctx.organizationId), eq(aiModelDefaults.purpose, "general"))).limit(1);
      if (!model) throw new BadRequestException("Configure a General AI model before creating a task");
      const [connection] = await db.select().from(aiProviderConnections).where(and(eq(aiProviderConnections.organizationId, ctx.organizationId), eq(aiProviderConnections.id, model.connectionId), eq(aiProviderConnections.enabled, true))).limit(1);
      if (!connection) throw new BadRequestException("Configured AI provider connection is unavailable");
      connectionId = connection.id;
      modelId = model.modelId;
    }
    const id = randomUUID();
    const [task] = await db.insert(aiTasks).values({ id, organizationId: ctx.organizationId, createdBy: ctx.userId, title, description, connectionId, modelId, ...agentSnapshot, leaseExpiresAt: this.queueLeaseExpiresAt() }).returning();
    await this.event(id, ctx.organizationId, "queued", dto.agentId ? `Task đang chờ Worker xử lý bởi Agent ${agentSnapshot.agentName}.` : "Task đang chờ Worker xử lý.");
    try { await this.jobs.enqueueAiTask({ taskId: id, organizationId: ctx.organizationId }); }
    catch (error) {
      await db.update(aiTasks).set({ status: "failed", error: "Không thể đưa task vào hàng đợi xử lý.", completedAt: new Date(), updatedAt: new Date() }).where(eq(aiTasks.id, id));
      await this.event(id, ctx.organizationId, "failed", "Không thể đưa task vào hàng đợi xử lý.");
      throw error;
    }
    return task;
  }

  /** Recover only expired leases; a live Worker renews its lease while generating. */
  private async recoverExpiredTasks(organizationId: string) {
    const now = new Date(), nextQueueLease = this.queueLeaseExpiresAt();
    const expired = and(eq(aiTasks.organizationId, organizationId), or(isNull(aiTasks.leaseExpiresAt), lt(aiTasks.leaseExpiresAt, now)));
    const recoveredRunning = await db.update(aiTasks).set({ status: "queued", executionToken: null, leaseExpiresAt: nextQueueLease, updatedAt: now }).where(and(eq(aiTasks.status, "running"), expired)).returning({ id: aiTasks.id });
    const recoveredQueued = await db.update(aiTasks).set({ leaseExpiresAt: nextQueueLease, updatedAt: now }).where(and(eq(aiTasks.status, "queued"), expired)).returning({ id: aiTasks.id });
    for (const task of [...recoveredRunning, ...recoveredQueued]) {
      const wasRunning = recoveredRunning.some((item) => item.id === task.id);
      await this.event(task.id, organizationId, "recovered", wasRunning ? "Lease của Worker đã hết hạn; task được đưa lại vào hàng đợi." : "Task chưa được Worker claim đúng hạn; đã enqueue lại.");
      try { await this.jobs.enqueueAiTask({ taskId: task.id, organizationId, recovery: true }); }
      catch { await this.event(task.id, organizationId, "recovery_queue_error", "Không thể enqueue recovery; hệ thống sẽ thử lại sau khi lease hết hạn."); }
    }
  }

  async list(ctx: RequestContext, status?: string, agentId?: string) {
    await this.recoverExpiredTasks(ctx.organizationId);
    return db.select().from(aiTasks).where(and(eq(aiTasks.organizationId, ctx.organizationId), ...(status ? [eq(aiTasks.status, status as typeof aiTasks.status.enumValues[number])] : []), ...(agentId ? [eq(aiTasks.agentId, agentId)] : []))).orderBy(desc(aiTasks.updatedAt)).limit(100);
  }

  async get(ctx: RequestContext, id: string) {
    await this.recoverExpiredTasks(ctx.organizationId);
    const [task] = await db.select().from(aiTasks).where(and(eq(aiTasks.organizationId, ctx.organizationId), eq(aiTasks.id, id))).limit(1);
    if (!task) throw new NotFoundException("Task not found");
    const events = await db.select().from(aiTaskEvents).where(and(eq(aiTaskEvents.organizationId, ctx.organizationId), eq(aiTaskEvents.taskId, id))).orderBy(aiTaskEvents.createdAt);
    return { ...task, events };
  }

  async cancel(ctx: RequestContext, id: string) {
    const [cancelled] = await db.update(aiTasks).set({ status: "cancelled", executionToken: null, leaseExpiresAt: null, updatedAt: new Date(), completedAt: new Date() }).where(and(eq(aiTasks.organizationId, ctx.organizationId), eq(aiTasks.id, id), or(eq(aiTasks.status, "queued"), eq(aiTasks.status, "running")))).returning({ id: aiTasks.id });
    if (!cancelled) {
      const [task] = await db.select({ id: aiTasks.id }).from(aiTasks).where(and(eq(aiTasks.organizationId, ctx.organizationId), eq(aiTasks.id, id))).limit(1);
      if (!task) throw new NotFoundException("Task not found");
      throw new BadRequestException("Task cannot be cancelled");
    }
    await this.event(id, ctx.organizationId, "cancelled", "Task cancelled by user");
    return { cancelled: true };
  }
}
