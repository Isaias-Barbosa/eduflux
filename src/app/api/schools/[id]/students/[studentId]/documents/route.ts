import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { reviewDocumentsSchema } from "@/lib/schools/management-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "student:documents:validate");
  if (access.error) return access.error;

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, id)))
    .limit(1);

  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = reviewDocumentsSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;
  const allValidated =
    data.birthCertificateStatus === "validado" &&
    data.schoolHistoryStatus === "validado" &&
    data.residenceProofStatus === "validado";

  await db
    .update(students)
    .set({
      birthCertificateStatus: data.birthCertificateStatus,
      schoolHistoryStatus: data.schoolHistoryStatus,
      residenceProofStatus: data.residenceProofStatus,
      docsStatus: allValidated ? "validado" : "pendente",
      docsValidatedBy: allValidated ? access.session.user.id : null,
      docsValidatedAt: allValidated ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));

  return Response.json({ ok: true, docsStatus: allValidated ? "validado" : "pendente" });
}
