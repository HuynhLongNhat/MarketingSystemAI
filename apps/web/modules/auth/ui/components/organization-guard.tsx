
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export const OrganizationGuard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();

  const {
    data: organization,
    isPending,
  } = authClient.useActiveOrganization();

  useEffect(() => {
    if (!isPending && !organization) {
      router.replace("/org-selection");
    }
  }, [isPending, organization, router]);

  if (isPending) {
    return <p>Đang kiểm tra Organization...</p>;
  }

  if (!organization) {
    return null;
  }

  return <>{children}</>;
};
