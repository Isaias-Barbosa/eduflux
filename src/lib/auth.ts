import "@/lib/env";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db/client";
import * as authSchema from "@/lib/db/auth-schema";

export const auth = betterAuth({
  appName: "EduFlux",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
});
