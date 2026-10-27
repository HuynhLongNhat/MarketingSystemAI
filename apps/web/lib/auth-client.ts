import { createAuthClient } from "better-auth/react";

const baseURL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
});