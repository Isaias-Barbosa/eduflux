import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";

const databaseUrl =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:./data/eduflux.db";
const authToken =
  process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

function provider() {
  if (databaseUrl.startsWith("file:")) return "sqlite-local";
  if (databaseUrl.startsWith("libsql:")) return "turso";
  return "libsql-remoto";
}

/** Endpoint de prontidão: mostra apenas flags, nunca valores secretos. */
export async function GET() {
  let status = "ok";
  let error = "";

  try {
    await db.get(sql`select 1 as ok`);
  } catch (caught) {
    status = "error";
    error = caught instanceof Error ? caught.message.slice(0, 300) : String(caught).slice(0, 300);
  }

  return Response.json(
    {
      database: {
        provider: provider(),
        configured: Boolean(databaseUrl),
        authTokenConfigured: Boolean(authToken),
        status,
        error,
      },
      auth: {
        secretConfigured: Boolean(process.env.BETTER_AUTH_SECRET),
        urlConfigured: Boolean(process.env.BETTER_AUTH_URL),
      },
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
