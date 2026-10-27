
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { organization } from "better-auth/plugins";

import {
  db,
  user,
  session,
  account,
  verification,
  organization as organizationTable,
  member,
  invitation,
} from "@workspace/db/node";

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set and contain at least 32 characters.",
  );
}

export const auth = betterAuth({
  appName: "MarketingSystemAI",

  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",

  secret,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      organization: organizationTable,
      member,
      invitation,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    organization(),
  ],
});
