CREATE TABLE "widget_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"greet_message" text NOT NULL,
	"default_suggestions" jsonb NOT NULL,
	"vapi_assistant_id" text,
	"vapi_phone_number" text
);
