import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  classroomWaitlist,
  students,
  teacherAssignments,
  teacherStudents,
} from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { validateClassroomEnrollment } from "@/lib/schools/classroom-capacity";
import { updateWaitlistSchema } from "@/lib/schools/management-validation";

type Context = {
  params: Promise<{ id: string; entryId: string }>;
};

export async function PATCH(request: Request, { params }: Context) {
  const { id, entryId } = await params;
  const access = await authorizeSchoolRequest(id, "waitlist:manage");
  if (access.error) return access.error;

  const [entry] = await db
    .select()
    .from(classroomWaitlist)
    .where(and(eq(classroomWaitlist.id, entryId), eq(classroomWaitlist.schoolId, id)))
    .limit(1);
  if (!entry) {
    return Response.json({ error: "Inscrição não encontrada." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateWaitlistSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  if (parsed.data.status === "atendido" && entry.classroomId) {
    const error = await validateClassroomEnrollment(id, entry.classroomId, entry.studentId);
    if (error) return invalidPayload(error);

    await db
      .update(students)
      .set({ classroomId: entry.classroomId })
      .where(eq(students.id, entry.studentId));

    if (entry.discipline) {
      const [assignment] = await db
        .select({ id: teacherAssignments.id })
        .from(teacherAssignments)
        .where(
          and(
            eq(teacherAssignments.schoolId, id),
            eq(teacherAssignments.classroomId, entry.classroomId),
            eq(teacherAssignments.discipline, entry.discipline),
          ),
        )
        .limit(1);
      if (assignment) {
        await db
          .insert(teacherStudents)
          .values({
            id: crypto.randomUUID(),
            schoolId: id,
            assignmentId: assignment.id,
            studentId: entry.studentId,
          })
          .onConflictDoNothing();
      }
    }
  }

  await db
    .update(classroomWaitlist)
    .set({ status: parsed.data.status })
    .where(eq(classroomWaitlist.id, entryId));

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id, entryId } = await params;
  const access = await authorizeSchoolRequest(id, "waitlist:manage");
  if (access.error) return access.error;

  const [entry] = await db
    .select({ id: classroomWaitlist.id })
    .from(classroomWaitlist)
    .where(and(eq(classroomWaitlist.id, entryId), eq(classroomWaitlist.schoolId, id)))
    .limit(1);
  if (!entry) {
    return Response.json({ error: "Inscrição não encontrada." }, { status: 404 });
  }

  await db.delete(classroomWaitlist).where(eq(classroomWaitlist.id, entryId));
  return Response.json({ ok: true });
}
