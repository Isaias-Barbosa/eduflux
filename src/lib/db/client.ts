import { mkdirSync } from "node:fs";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/eduflux.db";

// O libsql cria o arquivo, mas não cria a pasta; garantimos ela aqui.
if (databaseUrl.startsWith("file:")) {
  mkdirSync("./data", { recursive: true });
}

const client = createClient({ url: databaseUrl });

export const db = drizzle(client, {
  schema: { ...authSchema, ...appSchema },
});
