import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { students, studentUpdateRequests } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { studentUpdateRequestSchema } from "@/lib/schools/management-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "update-request:create");
  if (access.error) return access.error;

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, id)))
    .limit(1);

  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (student.guardianUserId !== access.session.user.id) {
    return Response.json(
      { error: "Você não é responsável por este aluno." },
      { status: 403 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = studentUpdateRequestSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const requestId = crypto.randomUUID();
  await db.insert(studentUpdateRequests).values({
    id: requestId,
    schoolId: id,
    studentId,
    userId: access.session.user.id,
    payload: JSON.stringify(parsed.data.payload),
    note: parsed.data.note,
  });

  return Response.json({ id: requestId }, { status: 201 });
}
