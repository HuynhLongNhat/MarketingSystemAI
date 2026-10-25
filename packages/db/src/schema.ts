import { jsonb, pgTable, text } from "drizzle-orm/pg-core";

export type DefaultSuggestions = {
  suggestion1?: string;
  suggestion2?: string;
  suggestion3?: string;
};

export const widgetSettings = pgTable("widget_settings", {
  organizationId: text("organization_id").primaryKey(),

  greetMessage: text("greet_message").notNull(),

  defaultSuggestions: jsonb("default_suggestions")
    .$type<DefaultSuggestions>()
    .notNull(),

  vapiAssistantId: text("vapi_assistant_id"),

  vapiPhoneNumber: text("vapi_phone_number"),
});

export type WidgetSettings = typeof widgetSettings.$inferSelect;
export type NewWidgetSettings = typeof widgetSettings.$inferInsert;