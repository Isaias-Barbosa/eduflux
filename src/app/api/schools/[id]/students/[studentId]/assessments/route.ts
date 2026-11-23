import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { students, studentAssessments } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { createAssessmentSchema } from "@/lib/schools/management-validation";
import { canAccessStudent } from "@/lib/schools/student-scope";

type Context = { params: Promise<{ id: string; studentId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "grade:read");
  if (access.error) return access.error;

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, id)))
    .limit(1);

  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (!(await canAccessStudent(access.session.user.id, id, student, access.role))) {
    return Response.json({ error: "Você não tem acesso a este aluno." }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(studentAssessments)
    .where(
      and(
        eq(studentAssessments.schoolId, id),
        eq(studentAssessments.studentId, studentId),
      ),
    )
    .orderBy(asc(studentAssessments.createdAt));

  return Response.json({ assessments: rows });
}

export async function POST(request: Request, { params }: Context) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "grade:write");
  if (access.error) return access.error;

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, id)))
    .limit(1);

  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (!(await canAccessStudent(access.session.user.id, id, student, access.role))) {
    return Response.json({ error: "Você não tem acesso a este aluno." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createAssessmentSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const assessmentId = crypto.randomUUID();
  await db.insert(studentAssessments).values({
    id: assessmentId,
    schoolId: id,
    studentId,
    discipline: parsed.data.discipline,
    assessment: parsed.data.assessment,
    grade: parsed.data.grade,
    presence: parsed.data.presence,
    recordedBy: access.session.user.id,
  });

  return Response.json({ id: assessmentId }, { status: 201 });
}
