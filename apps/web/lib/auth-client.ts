import { createAuthClient } from "better-auth/react";
import {
  organizationClient,
  phoneNumberClient,
} from "better-auth/client/plugins";

const baseURL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002"
).replace(/\/+$/, "");

export const authClient = createAuthClient({
  baseURL,
  plugins: [organizationClient(), phoneNumberClient()],
  fetchOptions: {
    credentials: "include",
  },
});