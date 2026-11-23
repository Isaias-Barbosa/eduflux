import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { studentUpdateRequests } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import {
  reviewUpdateRequestSchema,
  updateStudentSchema,
} from "@/lib/schools/management-validation";
import { applyStudentUpdate } from "@/lib/schools/student-update";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  const { id, requestId } = await params;
  const access = await authorizeSchoolRequest(id, "update-request:review");
  if (access.error) return access.error;

  const [updateRequest] = await db
    .select()
    .from(studentUpdateRequests)
    .where(
      and(
        eq(studentUpdateRequests.id, requestId),
        eq(studentUpdateRequests.schoolId, id),
      ),
    )
    .limit(1);

  if (!updateRequest) {
    return Response.json({ error: "Solicitação não encontrada." }, { status: 404 });
  }

  if (updateRequest.status !== "pendente") {
    return invalidPayload("Esta solicitação já foi analisada.");
  }

  const payload = await request.json().catch(() => null);
  const parsed = reviewUpdateRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return invalidPayload("Decisão inválida.");
  }

  if (parsed.data.decision === "aprovado") {
    const fields = JSON.parse(updateRequest.payload) as Record<string, string>;
    const studentData = updateStudentSchema.safeParse(fields);

    if (!studentData.success) {
      const issues = studentData.error.flatten();
      const firstIssue = Object.values(issues.fieldErrors).flat()[0];
      return invalidPayload(firstIssue ?? "Dados solicitados inválidos.");
    }

    const error = await applyStudentUpdate(
      id,
      updateRequest.studentId,
      studentData.data,
    );
    if (error) return invalidPayload(error);
  }

  await db
    .update(studentUpdateRequests)
    .set({
      status: parsed.data.decision,
      reviewNote: parsed.data.reviewNote || null,
      reviewedBy: access.session.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(studentUpdateRequests.id, requestId));

  return Response.json({ ok: true, status: parsed.data.decision });
}
