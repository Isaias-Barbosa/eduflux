import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { updateStudentSchema } from "@/lib/schools/management-validation";
import { applyStudentUpdate } from "@/lib/schools/student-update";

type Context = { params: Promise<{ id: string; studentId: string }> };

async function findStudent(schoolId: string, studentId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);

  return student;
}

export async function PATCH(request: Request, { params }: Context) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "student:update");
  if (access.error) return access.error;

  const student = await findStudent(id, studentId);
  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateStudentSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const error = await applyStudentUpdate(id, studentId, parsed.data);
  if (error) return invalidPayload(error);

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "student:delete");
  if (access.error) return access.error;

  const student = await findStudent(id, studentId);
  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  await db.delete(students).where(eq(students.id, studentId));

  return Response.json({ ok: true });
}
