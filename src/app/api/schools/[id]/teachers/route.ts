import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, schoolMembers, teachers } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { createTeacherSchema } from "@/lib/schools/management-validation";
import { createManagedUser, findUserByEmail } from "@/lib/schools/managed-users";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id);
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

  await db.transaction(async (tx) => {
    await tx.insert(teachers).values({
      id: teacherId,
      schoolId: id,
      userId: teacherUserId,
      name: data.name,
      email,
      discipline: data.discipline || "",
      classroomId: data.classroomId || null,
    });

    await tx.insert(schoolMembers).values({
      id: crypto.randomUUID(),
      schoolId: id,
      userId: teacherUserId,
      role: "professor",
    });
  });

  return Response.json(
    { id: teacherId, temporaryPassword },
    { status: 201 },
  );
}
