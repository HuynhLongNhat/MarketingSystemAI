
CREATE UNIQUE INDEX IF NOT EXISTS "ai_agents_id_org_unique"
ON "ai_agents" USING btree ("id", "organization_id");
--> statement-breakpoint

CREATE TABLE "office_desk_assignments" (
    "id" text PRIMARY KEY NOT NULL,
    "organization_id" text NOT NULL,
    "agent_id" text NOT NULL,
    "desk_id" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "office_desk_assignments"
ADD CONSTRAINT "office_desk_assignments_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "office_desk_assignments"
ADD CONSTRAINT "office_assignment_agent_org_fk"
FOREIGN KEY ("agent_id", "organization_id")
REFERENCES "public"."ai_agents"("id", "organization_id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "office_assignment_org_desk_unique"
ON "office_desk_assignments"
USING btree ("organization_id", "desk_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "office_assignment_org_agent_unique"
ON "office_desk_assignments"
USING btree ("organization_id", "agent_id");
--> statement-breakpoint

CREATE INDEX "office_assignment_org_idx"
ON "office_desk_assignments"
USING btree ("organization_id");
