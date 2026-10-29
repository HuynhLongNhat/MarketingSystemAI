
import { ForbiddenException } from "@nestjs/common";

import type { RequestContext } from "../auth/request-context.js";

export interface TenantJobData<TPayload = unknown> {
  organizationId: string;
  requestedBy: string;
  createdAt: string;
  payload: TPayload;
}

export function createTenantJobData<TPayload>(
  context: RequestContext,
  payload: TPayload,
): TenantJobData<TPayload> {
  if (!context.organizationId || !context.userId) {
    throw new ForbiddenException(
      "Valid tenant context required",
    );
  }

  return {
    organizationId: context.organizationId,
    requestedBy: context.userId,
    createdAt: new Date().toISOString(),
    payload,
  };
}

export function assertTenantJobData(
  value: unknown,
): asserts value is TenantJobData {
  if (
    !value ||
    typeof value !== "object" ||
    !("organizationId" in value) ||
    typeof value.organizationId !== "string" ||
    !value.organizationId ||
    !("requestedBy" in value) ||
    typeof value.requestedBy !== "string" ||
    !value.requestedBy ||
    !("createdAt" in value) ||
    typeof value.createdAt !== "string" ||
    !("payload" in value)
  ) {
    throw new ForbiddenException(
      "Invalid tenant job context",
    );
  }
}
