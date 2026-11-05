
import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  db,
  notifications,
} from "@workspace/db/node";

import {
  and,
  desc,
  eq,
  isNull,
} from "drizzle-orm";

import type { RequestContext } from "../auth/request-context.js";

@Injectable()
export class NotificationsService {
  async list(
    context: RequestContext,
    limit = 30,
  ) {
    const conditions = [
      eq(
        notifications.organizationId,
        context.organizationId,
      ),
      eq(
        notifications.recipientUserId,
        context.userId,
      ),
    ];

    const [items, unreadRows] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit),

      db
        .select({
          id: notifications.id,
        })
        .from(notifications)
        .where(
          and(
            ...conditions,
            isNull(notifications.readAt),
          ),
        ),
    ]);

    return {
      items,
      unreadCount: unreadRows.length,
    };
  }

  async markRead(
    context: RequestContext,
    notificationId: string,
  ) {
    const [updated] = await db
      .update(notifications)
      .set({
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(
            notifications.organizationId,
            context.organizationId,
          ),
          eq(
            notifications.recipientUserId,
            context.userId,
          ),
          isNull(notifications.readAt),
        ),
      )
      .returning();

    if (!updated) {
      const [existing] = await db
        .select({
          id: notifications.id,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(
              notifications.organizationId,
              context.organizationId,
            ),
            eq(
              notifications.recipientUserId,
              context.userId,
            ),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundException(
          "Notification not found",
        );
      }
    }

    return {
      success: true,
    };
  }

  async markAllRead(context: RequestContext) {
    await db
      .update(notifications)
      .set({
        readAt: new Date(),
      })
      .where(
        and(
          eq(
            notifications.organizationId,
            context.organizationId,
          ),
          eq(
            notifications.recipientUserId,
            context.userId,
          ),
          isNull(notifications.readAt),
        ),
      );

    return {
      success: true,
    };
  }
}
