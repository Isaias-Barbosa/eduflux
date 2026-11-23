import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { teachers } from "@/lib/db/schema";
import type { SchoolRole } from "./permissions";

type ScopedStudent = {
  classroomId: string | null;
  guardianUserId: string | null;
};

/** Professores veem apenas a própria turma; responsáveis, apenas seus alunos. */
export async function canAccessStudent(
  userId: string,
  schoolId: string,
  student: ScopedStudent,
  role: SchoolRole | null,
): Promise<boolean> {
  if (role === "responsavel") {
    return student.guardianUserId === userId;
  }

  if (role === "professor") {
    const [teacher] = await db
      .select({ classroomId: teachers.classroomId })
      .from(teachers)
      .where(and(eq(teachers.schoolId, schoolId), eq(teachers.userId, userId)))
      .limit(1);

    return Boolean(
      teacher?.classroomId && teacher.classroomId === student.classroomId,
    );
  }

  return true;
}
