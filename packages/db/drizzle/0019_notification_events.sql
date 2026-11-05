
CREATE TABLE "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "recipient_user_id" text NOT NULL,
  "conversation_id" text NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "notifications_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id")
    REFERENCES "organization"("id")
    ON DELETE CASCADE,

  CONSTRAINT "notifications_recipient_user_id_user_id_fk"
    FOREIGN KEY ("recipient_user_id")
    REFERENCES "user"("id")
    ON DELETE CASCADE,

  CONSTRAINT "notifications_conversation_org_fk"
    FOREIGN KEY ("conversation_id", "organization_id")
    REFERENCES "conversations"("id", "organization_id")
    ON DELETE CASCADE
);

CREATE INDEX "notifications_recipient_created_idx"
ON "notifications" (
  "organization_id",
  "recipient_user_id",
  "created_at"
);

CREATE INDEX "notifications_recipient_unread_idx"
ON "notifications" (
  "organization_id",
  "recipient_user_id",
  "read_at"
);

CREATE OR REPLACE FUNCTION notify_conversation_events()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'escalated' THEN

    INSERT INTO notifications (
      id,
      organization_id,
      recipient_user_id,
      conversation_id,
      type,
      title,
      body
    )
    SELECT
      gen_random_uuid()::text,
      NEW.organization_id,
      m.user_id,
      NEW.id,
      'conversation_escalated',
      'Có hội thoại cần hỗ trợ',
      'Một hội thoại mới đã được chuyển đến hàng đợi hỗ trợ.'
    FROM member m
    WHERE m.organization_id = NEW.organization_id;

  END IF;

  IF OLD.assigned_to_user_id
       IS DISTINCT FROM NEW.assigned_to_user_id
     AND NEW.assigned_to_user_id IS NOT NULL THEN

    INSERT INTO notifications (
      id,
      organization_id,
      recipient_user_id,
      conversation_id,
      type,
      title,
      body
    )
    VALUES (
      gen_random_uuid()::text,
      NEW.organization_id,
      NEW.assigned_to_user_id,
      NEW.id,
      'conversation_assigned',
      'Bạn được giao một hội thoại',
      'Một hội thoại đã được giao cho bạn xử lý.'
    );

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "conversations_notification_trigger"
AFTER UPDATE ON "conversations"
FOR EACH ROW
EXECUTE FUNCTION notify_conversation_events();
