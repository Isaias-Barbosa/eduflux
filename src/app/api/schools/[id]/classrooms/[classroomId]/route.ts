import { and, count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, students, teacherAssignments } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { logAudit } from "@/lib/schools/audit";
import {
  classroomOccupancyMap,
  validatePhysicalRoomCapacity,
} from "@/lib/schools/classroom-capacity";
import { updateClassroomSchema } from "@/lib/schools/management-validation";

type Context = {
  params: Promise<{ id: string; classroomId: string }>;
};

async function findClassroom(schoolId: string, classroomId: string) {
  const [row] = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.id, classroomId), eq(classrooms.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function PATCH(request: Request, { params }: Context) {
  const { id, classroomId } = await params;
  const access = await authorizeSchoolRequest(id, "classroom:update");
  if (access.error) return access.error;

  const classroom = await findClassroom(id, classroomId);
  if (!classroom) {
    return Response.json({ error: "Turma não encontrada." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateClassroomSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;
  const nextName = data.name?.trim() ?? classroom.name;
  const nextGrade = data.grade?.trim() ?? classroom.grade;
  const nextShift = data.shift ?? classroom.shift;
  const nextSchoolYear = data.schoolYear ?? classroom.schoolYear;
  const nextCapacity = data.capacity ?? classroom.capacity;
  const nextPhysicalRoomId =
    data.physicalRoomId === undefined
      ? classroom.physicalRoomId
      : data.physicalRoomId || null;
  const nextStatus = data.status ?? classroom.status;

  const capacityError = await validatePhysicalRoomCapacity(
    id,
    nextPhysicalRoomId,
    nextCapacity,
  );
  if (capacityError) return invalidPayload(capacityError);

  const occupancy = await classroomOccupancyMap(id);
  const occupied = occupancy.get(classroomId) ?? 0;
  if (nextCapacity < occupied) {
    return invalidPayload(
      `A turma já possui ${occupied} alunos; não é possível reduzir as vagas para ${nextCapacity}.`,
    );
  }

  if (nextName.toLowerCase() !== classroom.name.toLowerCase()) {
    const duplicates = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.schoolId, id),
          eq(classrooms.schoolYear, nextSchoolYear),
          eq(classrooms.name, nextName),
        ),
      )
      .limit(1);
    if (duplicates.length > 0 && duplicates[0].id !== classroomId) {
      return Response.json(
        { error: "Já existe uma turma com este nome no ano letivo informado." },
        { status: 409 },
      );
    }
  }

  await db
    .update(classrooms)
    .set({
      name: nextName,
      grade: nextGrade,
      shift: nextShift,
      schoolYear: nextSchoolYear,
      capacity: nextCapacity,
      physicalRoomId: nextPhysicalRoomId,
      status: nextStatus,
    })
    .where(eq(classrooms.id, classroomId));

  await logAudit({
    schoolId: id,
    actorUserId: access.session.user.id,
    actorName: access.session.user.name,
    actorRole: access.role ?? "desconhecido",
    action: "classroom.update",
    entityType: "classroom",
    entityId: classroomId,
    summary: `Atualizou a turma ${nextName} (${nextGrade ?? "série"}, ${nextShift ?? "turno"}, ${nextCapacity} vagas, ${nextStatus}).`,
  });

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id, classroomId } = await params;
  const access = await authorizeSchoolRequest(id, "classroom:delete");
  if (access.error) return access.error;

  const classroom = await findClassroom(id, classroomId);
  if (!classroom) {
    return Response.json({ error: "Turma não encontrada." }, { status: 404 });
  }

  const [enrolled] = await db
    .select({ total: count() })
    .from(students)
    .where(and(eq(students.classroomId, classroomId), eq(students.status, "ativo")));
  if (Number(enrolled.total) > 0) {
    return Response.json(
      { error: "Remova ou enturme os alunos desta turma antes de excluí-la." },
      { status: 409 },
    );
  }

  const [assignments] = await db
    .select({ total: count() })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.classroomId, classroomId));
  if (Number(assignments.total) > 0) {
    return Response.json(
      { error: "Esta turma possui vínculos de professores; remova-os antes de excluí-la." },
      { status: 409 },
    );
  }

  await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  await logAudit({
    schoolId: id,
    actorUserId: access.session.user.id,
    actorName: access.session.user.name,
    actorRole: access.role ?? "desconhecido",
    action: "classroom.delete",
    entityType: "classroom",
    entityId: classroomId,
    summary: `Excluiu a turma ${classroom.name}.`,
  });
  return Response.json({ ok: true });
}
