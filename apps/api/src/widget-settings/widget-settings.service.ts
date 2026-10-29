
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";

import { db, widgetSettings } from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import { assertTenantAccess } from "../common/tenant/tenant-access.js";

@Injectable()
export class WidgetSettingsService {
  async getCurrent(
    context: RequestContext,
  ) {
    return this.getByOrganizationId(
      context,
      context.organizationId,
    );
  }

  async getByOrganizationId(
    context: RequestContext,
    organizationId: string,
  ) {
    assertTenantAccess(context, organizationId);

    const [settings] = await db
      .select()
      .from(widgetSettings)
      .where(
        eq(
          widgetSettings.organizationId,
          context.organizationId,
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
