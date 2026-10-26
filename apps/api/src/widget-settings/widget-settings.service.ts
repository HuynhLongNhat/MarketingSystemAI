
import { Injectable } from '@nestjs/common';
import { eq } from "@workspace/db/node";
import { db, widgetSettings } from '@workspace/db/node';

@Injectable()
export class WidgetSettingsService {
  async getByOrganizationId(organizationId: string) {
    const [settings] = await db
      .select()
      .from(widgetSettings)
      .where(eq(widgetSettings.organizationId, organizationId))
      .limit(1);

    if (!settings) {
      return null;
    }

    // Preserve the response shape expected by the existing Convex client.
    return {
      organizationId: settings.organizationId,
      greetMessage: settings.greetMessage,
      defaultSuggestions: settings.defaultSuggestions,
      vapiSettings: {
        assistantId: settings.vapiAssistantId ?? undefined,
        phoneNumber: settings.vapiPhoneNumber ?? undefined,
      },
    };
  }
}
