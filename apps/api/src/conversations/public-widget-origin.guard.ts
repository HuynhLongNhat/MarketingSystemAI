import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { createHash } from "node:crypto";

import { contactSessions, db, widgetSettings } from "@workspace/db/node";
import { and, eq, gt, isNull } from "drizzle-orm";

function normalizeOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

@Injectable()
export class PublicWidgetOriginGuard implements CanActivate {
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async resolveOrganizationId(
    request: Request,
  ): Promise<string | null> {
    const organizationId = request.params?.organizationId;

    if (typeof organizationId === "string" && organizationId) {
      return organizationId;
    }

    const isSessionCreation =
      request.method === "POST" &&
      (request.path.endsWith("/sessions") ||
        request.path.endsWith("/guest-sessions"));

    if (isSessionCreation) {
      const body = request.body as Record<string, unknown> | undefined;

      return typeof body?.organizationId === "string"
        ? body.organizationId
        : null;
    }

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return null;
    }

    const token = authorization.slice(7).trim();

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return null;
    }

    const [session] = await db
      .select({
        organizationId: contactSessions.organizationId,
      })
      .from(contactSessions)
      .where(and(
        eq(contactSessions.sessionTokenHash, this.hashToken(token)),
        gt(contactSessions.expiresAt, new Date()),
        isNull(contactSessions.revokedAt),
      ))
      .limit(1);

    return session?.organizationId ?? null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const originHeader = request.headers.origin;

    if (!originHeader || originHeader === "null") {
      throw new ForbiddenException("Widget origin is not allowed");
    }

    const requestOrigin = normalizeOrigin(originHeader);

    if (!requestOrigin) {
      throw new ForbiddenException("Widget origin is not allowed");
    }

    const organizationId = await this.resolveOrganizationId(request);

    if (!organizationId) {
      throw new ForbiddenException("Widget origin is not allowed");
    }

    const [settings] = await db
      .select({
        allowedOrigins: widgetSettings.allowedOrigins,
      })
      .from(widgetSettings)
      .where(eq(widgetSettings.organizationId, organizationId))
      .limit(1);

    const allowedOrigins = settings?.allowedOrigins ?? [];

    const isAllowed = allowedOrigins.some(
      (allowedOrigin: string) =>
        normalizeOrigin(allowedOrigin) === requestOrigin,
    );
    if (!isAllowed) {
      throw new ForbiddenException("Widget origin is not allowed");
    }

    return true;
  }
}
