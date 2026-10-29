
import { ForbiddenException } from "@nestjs/common";
import { and, eq, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

import type { RequestContext } from "../../auth/request-context.js";

/**
 * Bắt buộc lấy tenant từ RequestContext đã xác thực.
 * Không sử dụng organizationId từ request body/query.
 */
export function tenantWhere(
  context: RequestContext,
  organizationColumn: AnyColumn,
  ...conditions: (SQL | undefined)[]
): SQL {
  if (!context.organizationId) {
    throw new ForbiddenException(
      "Active organization required",
    );
  }

  const tenantCondition = eq(
    organizationColumn,
    context.organizationId,
  );

  return and(tenantCondition, ...conditions)!;
}
