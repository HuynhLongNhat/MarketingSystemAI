
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

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new BadRequestException(
      `Invalid allowed origin: ${value}`,
    );
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new BadRequestException(
      `Allowed origin must be a valid HTTP(S) origin: ${value}`,
    );
  }

  return parsed.origin;
}

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

    if (!settings) {
      return {
        organizationId,
        greetMessage: DEFAULT_GREETING,
        defaultSuggestions: {
          suggestion1: "",
          suggestion2: "",
          suggestion3: "",
        },
        allowedOrigins: [],
      };
    }

    return {
      organizationId: settings.organizationId,
      greetMessage: settings.greetMessage,
      defaultSuggestions: settings.defaultSuggestions,
      allowedOrigins: settings.allowedOrigins ?? [],
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

    const allowedOrigins =
      dto.allowedOrigins === undefined
        ? undefined
        : [
            ...new Set(
              dto.allowedOrigins.map(normalizeOrigin),
            ),
          ];

    const updateValues = {
      greetMessage,
      defaultSuggestions,
      ...(allowedOrigins !== undefined
        ? { allowedOrigins }
        : {}),
    };

    await db
      .insert(widgetSettings)
      .values({
        organizationId: context.organizationId,
        greetMessage,
        defaultSuggestions,
        allowedOrigins: allowedOrigins ?? [],
      })
      .onConflictDoUpdate({
        target: widgetSettings.organizationId,
        set: updateValues,
      });

    return this.getCurrent(context);
  }
}
