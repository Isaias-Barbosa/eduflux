import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { studentTransferRecords, students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { buildHistorySnapshot } from "@/lib/schools/history";

type Context = { params: Promise<{ id: string; studentId: string }> };

async function findStudent(schoolId: string, studentId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);

  return student ?? null;
}

export async function GET(_request: Request, { params }: Context) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "history:read");
  if (access.error) return access.error;

  const student = await findStudent(id, studentId);
  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const records = await db
    .select()
    .from(studentTransferRecords)
    .where(
      and(
        eq(studentTransferRecords.schoolId, id),
        eq(studentTransferRecords.studentId, studentId),
      ),
    )
    .orderBy(desc(studentTransferRecords.createdAt));

  return Response.json({ records });
}

export async function POST(request: Request, { params }: Context) {
  const { id, studentId } = await params;
  const access = await authorizeSchoolRequest(id, "history:issue");
  if (access.error) return access.error;

  const student = await findStudent(id, studentId);
  if (!student) {
    return Response.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as {
    recordId?: string;
  } | null;

  const snapshot = await buildHistorySnapshot(
    id,
    studentId,
    access.session.user.name,
  );

  if (!snapshot) {
    return invalidPayload("Não foi possível montar o histórico do aluno.");
  }

  const issuedAt = new Date();

  if (payload?.recordId) {
    const [existing] = await db
      .select()
      .from(studentTransferRecords)
      .where(
        and(
          eq(studentTransferRecords.id, payload.recordId),
          eq(studentTransferRecords.schoolId, id),
          eq(studentTransferRecords.studentId, studentId),
        ),
      )
      .limit(1);

    if (!existing) {
      return Response.json(
        { error: "Registro de transferência não encontrado." },
        { status: 404 },
      );
    }

    await db
      .update(studentTransferRecords)
      .set({
        historySnapshot: snapshot,
        historyIssuedAt: issuedAt,
      })
      .where(eq(studentTransferRecords.id, existing.id));

    return Response.json({ id: existing.id, issuedAt, snapshot });
  }

  const recordId = crypto.randomUUID();
  await db.insert(studentTransferRecords).values({
    id: recordId,
    schoolId: id,
    studentId,
    destinationSchool: "",
    transferDate: new Date().toISOString().slice(0, 10),
    reason: "Emissão de histórico escolar",
    historySnapshot: snapshot,
    historyIssuedAt: issuedAt,
    createdBy: access.session.user.id,
  });

  return Response.json({ id: recordId, issuedAt, snapshot }, { status: 201 });
}
