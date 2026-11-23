import { and, desc, eq } from "drizzle-orm";

import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { students, studentUpdateRequests } from "@/lib/db/schema";
import { authorizeSchoolRequest } from "@/lib/schools/api-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "update-request:read");
  if (access.error) return access.error;

  const where =
    access.role === "responsavel"
      ? and(
          eq(studentUpdateRequests.schoolId, id),
          eq(studentUpdateRequests.userId, access.session.user.id),
        )
      : eq(studentUpdateRequests.schoolId, id);

  const rows = await db
    .select({
      id: studentUpdateRequests.id,
      studentId: studentUpdateRequests.studentId,
      studentName: students.name,
      status: studentUpdateRequests.status,
      note: studentUpdateRequests.note,
      payload: studentUpdateRequests.payload,
      reviewNote: studentUpdateRequests.reviewNote,
      createdAt: studentUpdateRequests.createdAt,
      requesterName: user.name,
    })
    .from(studentUpdateRequests)
    .innerJoin(students, eq(studentUpdateRequests.studentId, students.id))
    .innerJoin(user, eq(studentUpdateRequests.userId, user.id))
    .where(where)
    .orderBy(desc(studentUpdateRequests.createdAt));

  return Response.json({ requests: rows });
}
