import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { schools } from "@/lib/db/schema";

/**
 * Criadores são os usuários que possuem pelo menos uma escola.
 * Quando ainda não existe nenhuma escola, o primeiro usuário autenticado pode
 * fazer a configuração inicial (bootstrap).
 */
export async function isPlatformCreator(userId: string): Promise<boolean> {
  const owned = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.ownerId, userId))
    .limit(1);

  if (owned.length > 0) return true;

  const anySchool = await db.select({ id: schools.id }).from(schools).limit(1);
  return anySchool.length === 0;
}
