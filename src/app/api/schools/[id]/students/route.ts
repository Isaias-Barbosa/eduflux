import { and, eq } from "drizzle-orm";

import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { classrooms, students } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { logAudit } from "@/lib/schools/audit";
import {
  registerWaitlistEntry,
  suggestClassrooms,
  validateClassroomEnrollment,
} from "@/lib/schools/classroom-capacity";
import { createStudentSchema } from "@/lib/schools/management-validation";
import { nextEnrollmentNumber } from "@/lib/schools/student-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "student:create");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = createStudentSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;

  if (data.classroomId) {
    const classroom = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(and(eq(classrooms.id, data.classroomId), eq(classrooms.schoolId, id)))
      .limit(1);

    if (classroom.length === 0) {
      return invalidPayload("Turma inválida para esta escola.");
    }
  }

  let enrollmentWarning: string | null = null;
  let suggestedClassrooms: Awaited<ReturnType<typeof suggestClassrooms>> = [];
  let waitlistCreated = false;
  if (data.classroomId) {
    const capacityError = await validateClassroomEnrollment(id, data.classroomId);
    if (capacityError) {
      enrollmentWarning = capacityError;
      suggestedClassrooms = await suggestClassrooms(id, {
        grade: data.grade,
        shift: data.shift,
      });
    }
  }

  if (data.guardianUserId) {
    const guardian = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, data.guardianUserId))
      .limit(1);

    if (guardian.length === 0) {
      return invalidPayload("Responsável informado não encontrado.");
    }
  }

  const studentId = crypto.randomUUID();

  const enrollmentNumber = await db.transaction(async (tx) => {
    const number = await nextEnrollmentNumber(id, tx);
    await tx.insert(students).values({
      id: studentId,
      schoolId: id,
      classroomId: enrollmentWarning ? null : data.classroomId || null,
      guardianUserId: data.guardianUserId || null,
      name: data.name,
      enrollmentNumber: number,
      birthDate: data.birthDate,
      cpf: data.cpf || null,
      sex: data.sex,
      birthCity: data.birthCity,
      birthState: data.birthState,
      raceColor: data.raceColor,
      motherName: data.motherName,
      fatherName: data.fatherName || null,
      guardianName: data.guardianName,
      guardianCpf: data.guardianCpf,
      emergencyPhone: data.emergencyPhone,
      emergencyPhone2: data.emergencyPhone2 || null,
      zipCode: data.zipCode,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      grade: data.grade,
      shift: data.shift,
      status: data.status,
      birthCertificateStatus: data.birthCertificateStatus,
      schoolHistoryStatus: data.schoolHistoryStatus,
      residenceProofStatus: data.residenceProofStatus,
      docsStatus: "pendente",
    });
    return number;
  });

  if (enrollmentWarning && data.classroomId) {
    const entry = await registerWaitlistEntry({
      schoolId: id,
      studentId,
      classroomId: data.classroomId,
      discipline: "",
      note: enrollmentWarning,
    });
    waitlistCreated = entry.created;
  }

  await logAudit({
    schoolId: id,
    actorUserId: access.session.user.id,
    actorName: access.session.user.name,
    actorRole: access.role ?? "desconhecido",
    action: "student.create",
    entityType: "student",
    entityId: studentId,
    summary: `Matriculou o aluno ${data.name} (${enrollmentNumber}).`,
    metadata: { enrollmentNumber, waitlistCreated },
  });

  return Response.json(
    {
      id: studentId,
      enrollmentNumber,
      warning: enrollmentWarning,
      suggestions: suggestedClassrooms,
      waitlistCreated,
    },
    { status: 201 },
  );
}
