
import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  db,
  widgetSettings,
} from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import { assertTenantAccess } from "../common/tenant/tenant-access.js";
import { tenantWhere } from "../common/tenant/tenant-query.js";

import type { UpdateWidgetSettingsDto } from "./widget-settings.dto.js";

const DEFAULT_GREETING =
  "Xin chào! Chúng tôi có thể giúp gì cho bạn?";

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

    // Luôn trả về JSON hợp lệ kể cả khi Organization
    // chưa từng lưu cấu hình Widget.
    if (!settings) {
      return {
        organizationId,
        greetMessage: DEFAULT_GREETING,
        defaultSuggestions: {
          suggestion1: "",
          suggestion2: "",
          suggestion3: "",
        },
        vapiSettings: {
          assistantId: undefined,
          phoneNumber: undefined,
        },
      };
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

  async updateCurrent(
    context: RequestContext,
    dto: UpdateWidgetSettingsDto,
  ) {
    const greetMessage = dto.greetMessage.trim();

    if (!greetMessage) {
      throw new BadRequestException(
        "Greeting message cannot be empty",
      );
    }

    const defaultSuggestions = {
      suggestion1:
        dto.defaultSuggestions.suggestion1?.trim() ?? "",
      suggestion2:
        dto.defaultSuggestions.suggestion2?.trim() ?? "",
      suggestion3:
        dto.defaultSuggestions.suggestion3?.trim() ?? "",
    };

    await db
      .insert(widgetSettings)
      .values({
        organizationId: context.organizationId,
        greetMessage,
        defaultSuggestions,
      })
      .onConflictDoUpdate({
        target: widgetSettings.organizationId,
        set: {
          greetMessage,
          defaultSuggestions,
        },
      });

    return this.getCurrent(context);
  }
}
