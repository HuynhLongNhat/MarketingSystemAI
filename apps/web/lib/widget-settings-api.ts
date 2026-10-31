
import { apiFetch } from "./api-client";

export interface DefaultSuggestions {
  suggestion1?: string;
  suggestion2?: string;
  suggestion3?: string;
}

export interface WidgetSettings {
  organizationId: string;
  greetMessage: string;
  defaultSuggestions: DefaultSuggestions;
  vapiSettings: {
    assistantId?: string;
    phoneNumber?: string;
  };
}

export interface UpdateWidgetSettingsInput {
  greetMessage: string;
  defaultSuggestions: DefaultSuggestions;
}

export const widgetSettingsApi = {
  getCurrent() {
    return apiFetch<WidgetSettings | null>(
      "/widget-settings/current",
    );
  },

  updateCurrent(input: UpdateWidgetSettingsInput) {
    return apiFetch<WidgetSettings>(
      "/widget-settings/current",
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
  },
};
