import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, students } from "@/lib/db/schema";
import type { teacherAssignmentSchema } from "./management-validation";
import type { z } from "zod";

export type AssignmentInput = z.infer<typeof teacherAssignmentSchema>;

export type ValidatedAssignment = {
  classroomId: string;
  discipline: string;
  studentIds: string[];
  capacity: number;
};

type ValidationResult =
  | { ok: true; assignments: ValidatedAssignment[] }
  | { ok: false; error: string };

/** Confere que salas e alunos dos vínculos pertencem à mesma escola. */
export async function validateAssignments(
  schoolId: string,
  rawAssignments: AssignmentInput[],
): Promise<ValidationResult> {
  const assignments: ValidatedAssignment[] = [];

  for (const item of rawAssignments) {
    const [classroom] = await db
      .select({ id: classrooms.id, capacity: classrooms.capacity })
      .from(classrooms)
      .where(and(eq(classrooms.id, item.classroomId), eq(classrooms.schoolId, schoolId)))
      .limit(1);

    if (!classroom) {
      return { ok: false, error: "Turma inválida para esta escola." };
    }

    const studentIds = [...new Set(item.studentIds)].filter(Boolean);
    if (studentIds.length > 0) {
      const found = await db
        .select({ id: students.id })
        .from(students)
        .where(and(eq(students.schoolId, schoolId), inArray(students.id, studentIds)));

      if (found.length !== studentIds.length) {
        return { ok: false, error: "Um dos alunos não pertence a esta escola." };
      }
    }

    const label = item.discipline.trim() || "disciplina";
    if (studentIds.length > item.capacity) {
      return {
        ok: false,
        error: `${label}: ${studentIds.length} alunos excedem o limite de ${item.capacity} da turma.`,
      };
    }
    if (studentIds.length > classroom.capacity) {
      return {
        ok: false,
        error: `${label}: ${studentIds.length} alunos excedem as ${classroom.capacity} vagas da turma.`,
      };
    }

    assignments.push({
      classroomId: item.classroomId,
      discipline: item.discipline.trim(),
      studentIds,
      capacity: item.capacity,
    });
  }

  return { ok: true, assignments };
}
