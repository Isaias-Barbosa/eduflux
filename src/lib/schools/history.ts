import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  classrooms,
  schools,
  studentAssessments,
  studentOccurrences,
  students,
} from "@/lib/db/schema";

export type HistorySnapshot = Record<string, unknown>;

/** Congela em texto os dados escolares vigentes no momento da emissão. */
export async function buildHistorySnapshot(
  schoolId: string,
  studentId: string,
  issuerName?: string,
): Promise<HistorySnapshot | null> {
  const [row] = await db
    .select({ school: schools, student: students, classroomName: classrooms.name })
    .from(students)
    .innerJoin(schools, eq(students.schoolId, schools.id))
    .leftJoin(classrooms, eq(students.classroomId, classrooms.id))
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);

  if (!row) return null;

  const [assessments, occurrences] = await Promise.all([
    db
      .select()
      .from(studentAssessments)
      .where(
        and(
          eq(studentAssessments.schoolId, schoolId),
          eq(studentAssessments.studentId, studentId),
        ),
      )
      .orderBy(asc(studentAssessments.bimester), asc(studentAssessments.createdAt)),
    db
      .select()
      .from(studentOccurrences)
      .where(
        and(
          eq(studentOccurrences.schoolId, schoolId),
          eq(studentOccurrences.studentId, studentId),
        ),
      )
      .orderBy(asc(studentOccurrences.occurrenceDate)),
  ]);

  return {
    emittedAt: new Date().toISOString(),
    issuerName: issuerName ?? "Secretaria escolar",
    school: {
      name: row.school.name,
      legalName: row.school.legalName,
      cnpj: row.school.cnpj,
      inepCode: row.school.inepCode,
      city: row.school.city,
      state: row.school.state,
      directorName: row.school.directorName,
      secretaryName: row.school.secretaryName,
    },
    rules: {
      passingGrade: row.school.passingGrade,
      bimesters: row.school.bimesters,
      minFrequency: row.school.minFrequency,
    },
    student: {
      name: row.student.name,
      enrollmentNumber: row.student.enrollmentNumber,
      birthDate: row.student.birthDate,
      cpf: row.student.cpf,
      birthCity: row.student.birthCity,
      birthState: row.student.birthState,
      motherName: row.student.motherName,
      fatherName: row.student.fatherName,
      guardianName: row.student.guardianName,
      grade: row.student.grade,
      shift: row.student.shift,
      status: row.student.status,
      classroomName: row.classroomName,
    },
    assessments: assessments.map((item) => ({
      bimester: item.bimester,
      discipline: item.discipline,
      assessment: item.assessment,
      grade: item.grade,
      weight: item.weight,
      assessmentType: item.assessmentType,
      presence: item.presence,
    })),
    occurrences: occurrences.map((item) => ({
      date: item.occurrenceDate,
      type: item.type,
      severity: item.severity,
      description: item.description,
    })),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/** Representação legível do snapshot, usada para impressão/cópia no navegador. */
export function formatHistorySnapshot(snapshot: HistorySnapshot): string {
  const school = asRecord(snapshot.school);
  const rules = asRecord(snapshot.rules);
  const student = asRecord(snapshot.student);
  const assessments = Array.isArray(snapshot.assessments)
    ? (snapshot.assessments as Array<Record<string, unknown>>)
    : [];
  const occurrences = Array.isArray(snapshot.occurrences)
    ? (snapshot.occurrences as Array<Record<string, unknown>>)
    : [];

  const lines = [
    "HISTÓRICO ESCOLAR",
    String(school.name ?? ""),
    school.inepCode ? `INEP: ${String(school.inepCode)}` : "",
    school.city || school.state
      ? `${String(school.city ?? "")}/${String(school.state ?? "")}`
      : "",
    "",
    `Aluno(a): ${String(student.name ?? "")}`,
    `Matrícula: ${String(student.enrollmentNumber ?? "—")}`,
    `Nascimento: ${String(student.birthDate ?? "—")}`,
    `Naturalidade: ${String(student.birthCity ?? "—")}/${String(student.birthState ?? "—")}`,
    `Filiação: ${String(student.motherName ?? "—")} e ${String(student.fatherName ?? "—")}`,
    `Série/turma: ${String(student.grade ?? "—")} · ${String(student.classroomName ?? "—")}`,
    `Situação: ${String(student.status ?? "—")}`,
    "",
    `Média de aprovação: ${String(rules.passingGrade ?? "—")}`,
    `Bimestres: ${String(rules.bimesters ?? "—")}`,
    `Frequência mínima: ${String(rules.minFrequency ?? "—")}%`,
    "",
    "AVALIAÇÕES",
  ];

  for (const item of assessments) {
    lines.push(
      `${String(item.bimester)}º bimestre · ${String(item.discipline)} · ${String(item.assessment)} · nota ${String(item.grade)} · peso ${String(item.weight)} · ${String(item.presence)}`,
    );
  }

  if (occurrences.length > 0) {
    lines.push("", "OCORRÊNCIAS");
    for (const item of occurrences) {
      lines.push(
        `${String(item.date)} · ${String(item.type)} · ${String(item.severity)} · ${String(item.description)}`,
      );
    }
  }

  lines.push(
    "",
    `Emitido em ${new Date(String(snapshot.emittedAt ?? Date.now())).toLocaleString("pt-BR")}`,
    String(snapshot.issuerName ?? "Secretaria escolar"),
  );

  return lines.join("\n");
}
