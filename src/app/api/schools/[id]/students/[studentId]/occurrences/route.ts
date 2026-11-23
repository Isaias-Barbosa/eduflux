import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { studentOccurrences, students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { createOccurrenceSchema } from "@/lib/schools/management-validation";
import { canAccessStudent } from "@/lib/schools/student-scope";

type Context = { params: Promise<{ id: string; studentId: string }> };

async function findStudent(schoolId: string, studentId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);

  return student ?? null;
}

export async function GET(_request: Request, { params }: Context) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "occurrence:read");
  if (access.error) return access.error;

  const student = await findStudent(id, studentId);
  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (!(await canAccessStudent(access.session.user.id, id, student, access.role))) {
    return Response.json({ error: "Você não tem acesso a este aluno." }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(studentOccurrences)
    .where(
      and(
        eq(studentOccurrences.schoolId, id),
        eq(studentOccurrences.studentId, studentId),
      ),
    )
    .orderBy(desc(studentOccurrences.occurrenceDate), asc(studentOccurrences.createdAt));

  return Response.json({ occurrences: rows });
}

export async function POST(request: Request, { params }: Context) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "occurrence:write");
  if (access.error) return access.error;

  const student = await findStudent(id, studentId);
  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (!(await canAccessStudent(access.session.user.id, id, student, access.role))) {
    return Response.json({ error: "Você não tem acesso a este aluno." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createOccurrenceSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const occurrenceId = crypto.randomUUID();
  await db.insert(studentOccurrences).values({
    id: occurrenceId,
    schoolId: id,
    studentId,
    occurrenceDate: parsed.data.occurrenceDate,
    type: parsed.data.type,
    severity: parsed.data.severity,
    description: parsed.data.description,
    recordedBy: access.session.user.id,
  });

  return Response.json({ id: occurrenceId }, { status: 201 });
}
