import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { transferStudentSchema } from "@/lib/schools/management-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "student:transfer");
  if (access.error) return access.error;

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, id)))
    .limit(1);

  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = transferStudentSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;

  if (data.classroomId) {
    const classroom = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(and(eq(classrooms.id, data.classroomId), eq(classrooms.schoolId, id)))
      .limit(1);

    if (classroom.length === 0) {
      return invalidPayload("Sala de aula inválida para esta escola.");
    }
  }

  await db
    .update(students)
    .set({
      status: data.status,
      classroomId: data.classroomId || null,
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));

  return Response.json({ ok: true, status: data.status });
}
