
import { authClient } from "@/lib/auth-client";

export async function activateOrganization(
  organizationId: string,
): Promise<void> {
  const result = await authClient.organization.setActive({
    organizationId,
  });

  if (result.error) {
    throw new Error(
      result.error.message ??
        "Không thể chuyển Organization.",
    );
  }

  // Full navigation resets client-side state and in-memory caches.
  window.location.replace("/conversations");
}
