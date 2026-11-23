import { config as loadEnv } from "dotenv";

// drizzle-kit e o CLI do Better Auth não carregam os .env do Next sozinhos.
// dotenv não sobrescreve valores já vindos do ambiente (Vercel, shell, etc.).
for (const path of [".env.local", ".env.development.local", ".env"]) {
  loadEnv({ path });
}
