import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classroomWaitlist, classrooms, students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { registerWaitlistEntry } from "@/lib/schools/classroom-capacity";
import { createWaitlistSchema } from "@/lib/schools/management-validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "student:read");
  if (access.error) return access.error;

  const rows = await db
    .select({
      id: classroomWaitlist.id,
      studentId: classroomWaitlist.studentId,
      studentName: students.name,
      grade: students.grade,
      shift: students.shift,
      classroomId: classroomWaitlist.classroomId,
      classroomName: classrooms.name,
      discipline: classroomWaitlist.discipline,
      note: classroomWaitlist.note,
      status: classroomWaitlist.status,
      schoolYear: classroomWaitlist.schoolYear,
      createdAt: classroomWaitlist.createdAt,
    })
    .from(classroomWaitlist)
    .innerJoin(students, eq(classroomWaitlist.studentId, students.id))
    .leftJoin(classrooms, eq(classroomWaitlist.classroomId, classrooms.id))
    .where(eq(classroomWaitlist.schoolId, id))
    .orderBy(asc(classroomWaitlist.status), asc(classroomWaitlist.createdAt));

  return Response.json({ waitlist: rows });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "waitlist:manage");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = createWaitlistSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;
  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, data.studentId), eq(students.schoolId, id)))
    .limit(1);
  if (!student) return invalidPayload("Aluno inválido para esta escola.");

  const result = await registerWaitlistEntry({
    schoolId: id,
    studentId: data.studentId,
    classroomId: data.classroomId || null,
    discipline: data.discipline,
    note: data.note,
  });

  return Response.json(result, { status: result.created ? 201 : 200 });
}
