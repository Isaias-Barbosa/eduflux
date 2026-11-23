import { randomBytes } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  classrooms,
  schoolMembers,
  students,
  teacherAssignments,
  teacherStudents,
  teachers,
} from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { createTeacherSchema } from "@/lib/schools/management-validation";
import { createManagedUser, findUserByEmail } from "@/lib/schools/managed-users";
import {
  validateAssignments,
  type AssignmentInput,
} from "@/lib/schools/teacher-assignments";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "teacher:read");
  if (access.error) return access.error;

  const rows = await db
    .select()
    .from(teachers)
    .where(eq(teachers.schoolId, id))
    .orderBy(asc(teachers.name));

  const teacherIds = rows.map((row) => row.id);
  const assignments =
    teacherIds.length > 0
      ? await db
          .select({
            id: teacherAssignments.id,
            teacherId: teacherAssignments.teacherId,
            classroomId: teacherAssignments.classroomId,
            classroomName: classrooms.name,
            discipline: teacherAssignments.discipline,
            capacity: teacherAssignments.capacity,
          })
          .from(teacherAssignments)
          .innerJoin(classrooms, eq(teacherAssignments.classroomId, classrooms.id))
          .where(inArray(teacherAssignments.teacherId, teacherIds))
          .orderBy(asc(classrooms.name), asc(teacherAssignments.discipline))
      : [];

  const assignmentIds = assignments.map((row) => row.id);
  const links =
    assignmentIds.length > 0
      ? await db
          .select({
            assignmentId: teacherStudents.assignmentId,
            studentId: teacherStudents.studentId,
            studentName: students.name,
          })
          .from(teacherStudents)
          .innerJoin(students, eq(teacherStudents.studentId, students.id))
          .where(inArray(teacherStudents.assignmentId, assignmentIds))
      : [];

  return Response.json({
    teachers: rows.map((teacher) => ({
      ...teacher,
      assignments: assignments
        .filter((assignment) => assignment.teacherId === teacher.id)
        .map((assignment) => ({
          ...assignment,
          students: links
            .filter((link) => link.assignmentId === assignment.id)
            .map((link) => ({ id: link.studentId, name: link.studentName })),
        })),
    })),
  });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "teacher:create");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = createTeacherSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  let assignmentInputs: AssignmentInput[] = data.assignments;
  if (assignmentInputs.length === 0 && data.classroomId) {
    const legacyStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(eq(students.schoolId, id), eq(students.classroomId, data.classroomId)),
      );

    assignmentInputs = [
      {
        classroomId: data.classroomId,
        discipline: data.discipline,
        studentIds: legacyStudents.map((row) => row.id),
        capacity: 25,
      },
    ];
  }

  if (assignmentInputs.length === 0) {
    return invalidPayload("Informe ao menos uma sala para o professor.");
  }

  const validated = await validateAssignments(id, assignmentInputs);
  if (!validated.ok) return invalidPayload(validated.error);

  const existing = await findUserByEmail(email);
  if (existing) {
    return Response.json(
      { error: "Já existe um usuário com este e-mail." },
      { status: 409 },
    );
  }

  const temporaryPassword = `${randomBytes(6).toString("base64url")}Aa1!`;

  let teacherUserId: string;
  try {
    teacherUserId = await createManagedUser({
      name: data.name,
      email,
      password: temporaryPassword,
    });
  } catch {
    return invalidPayload("Não foi possível criar o usuário do professor.");
  }

  const teacherId = crypto.randomUUID();
  const uniqueAssignments = deduplicateAssignments(validated.assignments);
  const primary = uniqueAssignments[0];

  await db.transaction(async (tx) => {
    await tx.insert(teachers).values({
      id: teacherId,
      schoolId: id,
      userId: teacherUserId,
      name: data.name,
      email,
      discipline: primary.discipline,
      classroomId: primary.classroomId,
    });

    await tx.insert(schoolMembers).values({
      id: crypto.randomUUID(),
      schoolId: id,
      userId: teacherUserId,
      role: "professor",
    });

    for (const assignment of uniqueAssignments) {
      const assignmentId = crypto.randomUUID();
      await tx.insert(teacherAssignments).values({
        id: assignmentId,
        schoolId: id,
        teacherId,
        classroomId: assignment.classroomId,
        discipline: assignment.discipline,
        capacity: assignment.capacity,
      });

      for (const studentId of assignment.studentIds) {
        await tx.insert(teacherStudents).values({
          id: crypto.randomUUID(),
          schoolId: id,
          assignmentId,
          studentId,
        });
      }
    }
  });

  return Response.json(
    { id: teacherId, temporaryPassword },
    { status: 201 },
  );
}

function deduplicateAssignments(items: AssignmentInput[]) {
  const seen = new Map<string, AssignmentInput>();
  for (const item of items) {
    const key = `${item.classroomId}|${item.discipline}`;
    const existing = seen.get(key);
    seen.set(key, {
      ...item,
      capacity: Math.max(existing?.capacity ?? 0, item.capacity),
      studentIds: [...new Set([...(existing?.studentIds ?? []), ...item.studentIds])],
    });
  }
  return [...seen.values()];
}
