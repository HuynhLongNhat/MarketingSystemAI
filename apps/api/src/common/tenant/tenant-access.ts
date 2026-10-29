
import { ForbiddenException } from "@nestjs/common";

import type { RequestContext } from "../../auth/request-context.js";

export function assertTenantAccess(
  context: RequestContext,
  organizationId: string,
): void {
  if (!organizationId || organizationId !== context.organizationId) {
    throw new ForbiddenException(
      "Cross-tenant access denied",
    );
  }
}
