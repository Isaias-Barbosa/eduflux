import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { account, user } from "@/lib/db/auth-schema";

/**
 * Cria um usuário sem autenticá-lo na sessão atual. O `signUpEmail` do Better
 * Auth troca o cookie de quem está navegando, então admin/professores criados
 * pelo gestor precisam ser inseridos diretamente na tabela de usuários.
 */
export async function createManagedUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const id = crypto.randomUUID();
  const hashedPassword = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name: name.trim(),
      email: normalizedEmail,
      emailVerified: false,
    });

    await tx.insert(account).values({
      id: crypto.randomUUID(),
      userId: id,
      providerId: "credential",
      accountId: id,
      password: hashedPassword,
    });
  });

  return id;
}

export async function findUserByEmail(email: string) {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(1);

  return existing;
}
