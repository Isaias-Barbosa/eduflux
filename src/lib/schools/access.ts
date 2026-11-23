import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/client";
import { schools, schoolMembers } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

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

export async function canAccessSchool(
  userId: string,
  schoolId: string,
): Promise<boolean> {
  if (await isPlatformCreator(userId)) return true;

  const membership = await db
    .select({ id: schoolMembers.id })
    .from(schoolMembers)
    .where(
      and(
        eq(schoolMembers.userId, userId),
        eq(schoolMembers.schoolId, schoolId),
      ),
    )
    .limit(1);

  return membership.length > 0;
}

/** Gerenciam a escola o criador e o administrador vinculado a ela. */
export async function canManageSchool(
  userId: string,
  schoolId: string,
): Promise<boolean> {
  if (await isPlatformCreator(userId)) return true;

  const membership = await db
    .select({ role: schoolMembers.role })
    .from(schoolMembers)
    .where(
      and(
        eq(schoolMembers.userId, userId),
        eq(schoolMembers.schoolId, schoolId),
      ),
    )
    .limit(1);

  return membership[0]?.role === "admin" || membership[0]?.role === "owner";
}

export async function requireCreator() {
  const session = await requireUser();

  if (!(await isPlatformCreator(session.user.id))) {
    redirect("/dashboard");
  }

  return session;
}
