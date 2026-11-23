import { and, eq } from "drizzle-orm";

import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { classrooms, students } from "@/lib/db/schema";
import type { updateStudentSchema } from "./management-validation";
import type { z } from "zod";

type UpdateData = z.infer<typeof updateStudentSchema>;

/** Aplica campos Editáveis do aluno. Retorna uma mensagem de erro, se houver. */
export async function applyStudentUpdate(
  schoolId: string,
  studentId: string,
  data: UpdateData,
): Promise<string | null> {
  if (data.classroomId) {
    const classroom = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(and(eq(classrooms.id, data.classroomId), eq(classrooms.schoolId, schoolId)))
      .limit(1);

    if (classroom.length === 0) {
      return "Sala de aula inválida para esta escola.";
    }
  }

  if (data.guardianUserId) {
    const guardian = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, data.guardianUserId))
      .limit(1);

    if (guardian.length === 0) {
      return "Responsável informado não encontrado.";
    }
  }

  const values: Partial<typeof students.$inferInsert> = {
    updatedAt: new Date(),
  };

  const set = <K extends keyof typeof values>(key: K, value: unknown) => {
    if (value !== undefined) {
      Object.assign(values, { [key]: value });
    }
  };

  set("name", data.name);
  set("birthDate", data.birthDate);
  set("cpf", data.cpf || null);
  set("sex", data.sex);
  set("birthCity", data.birthCity);
  set("birthState", data.birthState);
  set("raceColor", data.raceColor);
  set("motherName", data.motherName);
  set("fatherName", data.fatherName || null);
  set("guardianName", data.guardianName);
  set("guardianCpf", data.guardianCpf);
  set("emergencyPhone", data.emergencyPhone);
  set("emergencyPhone2", data.emergencyPhone2 || null);
  set("zipCode", data.zipCode);
  set("street", data.street);
  set("number", data.number);
  set("complement", data.complement || null);
  set("neighborhood", data.neighborhood);
  set("city", data.city);
  set("state", data.state);
  set("grade", data.grade);
  set("shift", data.shift);
  set(
    "classroomId",
    data.classroomId === undefined ? undefined : data.classroomId || null,
  );
  set(
    "guardianUserId",
    data.guardianUserId === undefined ? undefined : data.guardianUserId || null,
  );

  await db.update(students).set(values).where(eq(students.id, studentId));

  return null;
}
