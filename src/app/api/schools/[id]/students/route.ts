import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { createStudentSchema } from "@/lib/schools/management-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id);
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = createStudentSchema.safeParse(payload);

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

  const studentId = crypto.randomUUID();

  await db.insert(students).values({
    id: studentId,
    schoolId: id,
    classroomId: data.classroomId || null,
    name: data.name,
  });

  return Response.json({ id: studentId }, { status: 201 });
}
