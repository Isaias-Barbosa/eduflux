import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { enrollmentSequences } from "@/lib/db/schema";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type WritableDb = Pick<typeof db, "select" | "insert" | "update">;

/**
 * Número de registro anual por escola, gerado dentro da transação da matrícula.
 * Formato: AAAANNNN (ex.: 20260001).
 */
export async function nextEnrollmentNumber(
  schoolId: string,
  connection: WritableDb | Transaction = db,
): Promise<string> {
  const year = new Date().getFullYear();
  const [sequence] = await connection
    .select()
    .from(enrollmentSequences)
    .where(
      and(
        eq(enrollmentSequences.schoolId, schoolId),
        eq(enrollmentSequences.year, year),
      ),
    )
    .limit(1);

  const lastNumber = (sequence?.lastNumber ?? 0) + 1;

  if (sequence) {
    await connection
      .update(enrollmentSequences)
      .set({ lastNumber })
      .where(eq(enrollmentSequences.id, sequence.id));
  } else {
    await connection.insert(enrollmentSequences).values({
      id: crypto.randomUUID(),
      schoolId,
      year,
      lastNumber,
    });
  }

  return `${year}${String(lastNumber).padStart(4, "0")}`;
}
