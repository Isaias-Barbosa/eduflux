import { and, eq, inArray } from "drizzle-orm";

import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import {
  schoolMembers,
  teacherAssignments,
  teacherStudents,
  teachers,
} from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { updateTeacherSchema } from "@/lib/schools/management-validation";
import { validateAssignments } from "@/lib/schools/teacher-assignments";

type Context = {
  params: Promise<{ id: string; teacherId: string }>;
};

async function findTeacher(schoolId: string, teacherId: string) {
  const [teacher] = await db
    .select()
    .from(teachers)
    .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, schoolId)))
    .limit(1);

  return teacher ?? null;
}

export async function PATCH(request: Request, { params }: Context) {
  const { id, teacherId } = await params;
  const access = await authorizeSchoolRequest(id, "teacher:update");
  if (access.error) return access.error;

  const teacher = await findTeacher(id, teacherId);
  if (!teacher) {
    return Response.json({ error: "Professor não encontrado." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateTeacherSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;
  if (data.email && data.email.toLowerCase() !== teacher.email.toLowerCase()) {
    return invalidPayload("O e-mail do usuário não pode ser alterado por aqui.");
  }

  let validatedAssignments: Awaited<
    ReturnType<typeof validateAssignments>
  > | null = null;

  if (data.assignments) {
    if (data.assignments.length === 0) {
      return invalidPayload("Informe ao menos uma sala para o professor.");
    }
    validatedAssignments = await validateAssignments(id, data.assignments);
    if (!validatedAssignments.ok) {
      return invalidPayload(validatedAssignments.error);
    }
  }

  const assignmentsToSave = validatedAssignments?.ok
    ? validatedAssignments.assignments
    : [];
  const primary = assignmentsToSave[0] ?? null;

  await db.transaction(async (tx) => {
    await tx
      .update(teachers)
      .set({
        name: data.name ?? teacher.name,
        discipline: primary?.discipline ?? teacher.discipline,
        classroomId: primary?.classroomId ?? teacher.classroomId,
      })
      .where(eq(teachers.id, teacherId));

    if (assignmentsToSave.length === 0) return;

    const oldAssignments = await tx
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(eq(teacherAssignments.teacherId, teacherId));

    const oldIds = oldAssignments.map((row) => row.id);
    if (oldIds.length > 0) {
      await tx
        .delete(teacherStudents)
        .where(inArray(teacherStudents.assignmentId, oldIds));
      await tx
        .delete(teacherAssignments)
        .where(inArray(teacherAssignments.id, oldIds));
    }

    for (const assignment of assignmentsToSave) {
      const assignmentId = crypto.randomUUID();
      await tx.insert(teacherAssignments).values({
        id: assignmentId,
        schoolId: id,
        teacherId,
        classroomId: assignment.classroomId,
        discipline: assignment.discipline,
        capacity: assignment.capacity,
      });

      for (const studentId of new Set(assignment.studentIds)) {
        await tx.insert(teacherStudents).values({
          id: crypto.randomUUID(),
          schoolId: id,
          assignmentId,
          studentId,
        });
      }
    }
  });

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id, teacherId } = await params;
  const access = await authorizeSchoolRequest(id, "teacher:update");
  if (access.error) return access.error;

  const teacher = await findTeacher(id, teacherId);
  if (!teacher) {
    return Response.json({ error: "Professor não encontrado." }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(teachers).where(eq(teachers.id, teacherId));
    await tx
      .delete(schoolMembers)
      .where(
        and(
          eq(schoolMembers.schoolId, id),
          eq(schoolMembers.userId, teacher.userId),
        ),
      );
    await tx.delete(user).where(eq(user.id, teacher.userId));
  });

  return Response.json({ ok: true });
}
