"use client";

import { Suspense } from "react";

import { AuthView } from "@/modules/auth/ui/views/auth-view";

// useSearchParams() trong AuthView cần Suspense boundary khi build Next.js 15.
export const SignInView = () => (
  <Suspense fallback={null}>
    <AuthView mode="sign-in" />
  </Suspense>
);