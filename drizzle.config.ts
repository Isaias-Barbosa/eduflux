import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit não carrega os arquivos .env do Next automaticamente.
for (const path of [".env.local", ".env.development.local", ".env"]) {
  loadEnv({ path });
}

const databaseUrl =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:./data/eduflux.db";
const authToken =
  process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

const isRemote = /^(libsql|https?):/.test(databaseUrl);

export default defineConfig({
  schema: "./src/lib/db/all-schema.ts",
  out: "./drizzle",
  dialect: isRemote ? "turso" : "sqlite",
  dbCredentials: isRemote
    ? { url: databaseUrl, authToken: authToken ?? "" }
    : { url: databaseUrl },
});
