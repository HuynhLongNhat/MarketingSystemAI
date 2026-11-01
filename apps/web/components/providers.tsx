"use client";

import * as React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl
  ? new ConvexReactClient(convexUrl)
  : null;

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = convex ? (
    <ConvexProvider client={convex}>{children}</ConvexProvider>
  ) : (
    <>{children}</>
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {content}
    </ThemeProvider>
  );
}