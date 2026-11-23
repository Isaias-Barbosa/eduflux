import "@/lib/env";

import { mkdirSync } from "node:fs";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

// EDUFLUX_* aponta para o banco fixo do Turso (persiste entre deploys).
// TURSO_* vem da integração da Vercel, que cria um branch por deployment.
// DATABASE_URL é usado apenas no desenvolvimento local (arquivo SQLite).
const databaseUrl =
  process.env.EDUFLUX_DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:./data/eduflux.db";
const authToken =
  process.env.EDUFLUX_DATABASE_TOKEN ??
  process.env.TURSO_AUTH_TOKEN ??
  process.env.DATABASE_AUTH_TOKEN;

const isRemote = /^(libsql|https?):/.test(databaseUrl);

// O libsql cria o arquivo, mas não cria a pasta; apenas faz isso em modo local.
if (databaseUrl.startsWith("file:")) {
  mkdirSync("./data", { recursive: true });
}

const client = isRemote
  ? createClient({ url: databaseUrl, authToken })
  : createClient({ url: databaseUrl });

export const db = drizzle(client, {
  schema: { ...authSchema, ...appSchema },
});
