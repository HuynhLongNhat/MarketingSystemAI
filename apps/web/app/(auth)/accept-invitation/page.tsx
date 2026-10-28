
import { AcceptInvitationView } from "@/modules/auth/ui/views/accept-invitation-view";
import { Suspense } from "react";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<p>Đang tải lời mời...</p>}>
      <AcceptInvitationView />
    </Suspense>
  );
}
