
import { Injectable } from "@nestjs/common";

import { db, widgetSettings } from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import { assertTenantAccess } from "../common/tenant/tenant-access.js";
import { tenantWhere } from "../common/tenant/tenant-query.js";

@Injectable()
export class WidgetSettingsService {
  async getCurrent(context: RequestContext) {
    return this.getByOrganizationId(
      context,
      context.organizationId,
    );
  }

  async getByOrganizationId(
    context: RequestContext,
    organizationId: string,
  ) {
    // Giữ nguyên bảo vệ cho legacy endpoint.
    assertTenantAccess(context, organizationId);

    const [settings] = await db
      .select()
      .from(widgetSettings)
      .where(
        tenantWhere(
          context,
          widgetSettings.organizationId,
        ),
      )
      .limit(1);

    if (!settings) {
      return null;
    }

    return {
      organizationId: settings.organizationId,
      greetMessage: settings.greetMessage,
      defaultSuggestions: settings.defaultSuggestions,
      vapiSettings: {
        assistantId:
          settings.vapiAssistantId ?? undefined,
        phoneNumber:
          settings.vapiPhoneNumber ?? undefined,
      },
    };
  }
}
