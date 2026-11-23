import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { studentAssessments, students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { updateAssessmentSchema } from "@/lib/schools/management-validation";
import { canAccessStudent, canTeacherManageDiscipline } from "@/lib/schools/student-scope";

type Context = {
  params: Promise<{ id: string; studentId: string; assessmentId: string }>;
};

async function findAssessment(schoolId: string, studentId: string, assessmentId: string) {
  const [assessment] = await db
    .select()
    .from(studentAssessments)
    .where(
      and(
        eq(studentAssessments.id, assessmentId),
        eq(studentAssessments.schoolId, schoolId),
        eq(studentAssessments.studentId, studentId),
      ),
    )
    .limit(1);

  return assessment ?? null;
}

async function findStudent(schoolId: string, studentId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);

  return student ?? null;
}

async function checkDisciplineScope(
  role: string | null,
  userId: string,
  schoolId: string,
  studentId: string,
  disciplines: string[],
) {
  if (role !== "professor") return null;

  for (const discipline of disciplines.filter(Boolean)) {
    const allowed = await canTeacherManageDiscipline(
      userId,
      schoolId,
      studentId,
      discipline,
    );
    if (!allowed) {
      return Response.json(
        { error: "Você só pode mexer nas avaliações das disciplinas atribuídas a você." },
        { status: 403 },
      );
    }
  }

  return null;
}

export async function PATCH(request: Request, { params }: Context) {
  const { id, studentId, assessmentId } = await params;
  const access = await authorizeSchoolRequest(id, "grade:update");
  if (access.error) return access.error;

  const assessment = await findAssessment(id, studentId, assessmentId);
  if (!assessment) {
    return Response.json({ error: "Avaliação não encontrada." }, { status: 404 });
  }

  const student = await findStudent(id, studentId);
  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (!(await canAccessStudent(access.session.user.id, id, student, access.role))) {
    return Response.json({ error: "Você não tem acesso a este aluno." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateAssessmentSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const scopeError = await checkDisciplineScope(
    access.role,
    access.session.user.id,
    id,
    studentId,
    [assessment.discipline, parsed.data.discipline ?? ""],
  );
  if (scopeError) return scopeError;

  await db
    .update(studentAssessments)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(studentAssessments.id, assessmentId));

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id, studentId, assessmentId } = await params;
  const access = await authorizeSchoolRequest(id, "grade:update");
  if (access.error) return access.error;

  const assessment = await findAssessment(id, studentId, assessmentId);
  if (!assessment) {
    return Response.json({ error: "Avaliação não encontrada." }, { status: 404 });
  }

  const student = await findStudent(id, studentId);
  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  if (!(await canAccessStudent(access.session.user.id, id, student, access.role))) {
    return Response.json({ error: "Você não tem acesso a este aluno." }, { status: 403 });
  }

  const scopeError = await checkDisciplineScope(
    access.role,
    access.session.user.id,
    id,
    studentId,
    [assessment.discipline],
  );
  if (scopeError) return scopeError;

  await db
    .delete(studentAssessments)
    .where(eq(studentAssessments.id, assessmentId));

  return Response.json({ ok: true });
}
