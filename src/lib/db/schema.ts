import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema";
import type { FacilityOption, ShiftOption } from "@/lib/schools/options";
import type { SchoolSegment } from "@/lib/schools/segments";

/**
 * Uma escola=cada contrato da plataforma. O `segment` define quais módulos
 * ficam disponíveis no painel daquela escola.
 */
export const schools = sqliteTable(
  "schools",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    slug: text("slug").notNull().unique(),
    segment: text("segment", {
      enum: ["infantil", "fundamental", "medio"],
    }).$type<SchoolSegment>().notNull(),
    cnpj: text("cnpj"),
    inepCode: text("inep_code"),
    foundedYear: integer("founded_year"),
    phone: text("phone"),
    email: text("email"),
    zipCode: text("zip_code"),
    street: text("street"),
    number: text("number"),
    complement: text("complement"),
    neighborhood: text("neighborhood"),
    city: text("city"),
    state: text("state"),
    directorName: text("director_name").notNull(),
    directorEmail: text("director_email"),
    directorPhone: text("director_phone"),
    pedagogicalCoordinator: text("pedagogical_coordinator"),
    secretaryName: text("secretary_name"),
    shifts: text("shifts", { mode: "json" })
      .$type<ShiftOption[]>()
      .notNull()
      .default([]),
    classrooms: integer("classrooms"),
    facilities: text("facilities", { mode: "json" })
      .$type<FacilityOption[]>()
      .notNull()
      .default([]),
    status: text("status", { enum: ["ativa", "inativa"] })
      .notNull()
      .default("ativa"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("schools_owner_id_idx").on(table.ownerId),
    index("schools_segment_idx").on(table.segment),
  ],
);

/** Vínculo entre usuários e escolas (um usuário pode administrar várias). */
export const schoolMembers = sqliteTable(
  "school_members",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role", {
      enum: [
        "owner",
        "admin",
        "secretaria",
        "auxiliar",
        "direcao",
        "professor",
        "responsavel",
      ],
    })
      .notNull()
      .default("admin"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("school_members_school_user_idx").on(
      table.schoolId,
      table.userId,
    ),
    index("school_members_user_id_idx").on(table.userId),
  ],
);

/** Salas/turmas da escola. Um professor pode ser responsável por uma sala. */
export const classrooms = sqliteTable(
  "classrooms",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shift: text("shift"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("classrooms_school_name_idx").on(table.schoolId, table.name),
    index("classrooms_school_id_idx").on(table.schoolId),
  ],
);

/** Professores cadastrados pelo administrador da escola. */
export const teachers = sqliteTable(
  "teachers",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    discipline: text("discipline").notNull().default(""),
    classroomId: text("classroom_id").references(() => classrooms.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("teachers_school_email_idx").on(table.schoolId, table.email),
    index("teachers_school_id_idx").on(table.schoolId),
    index("teachers_classroom_id_idx").on(table.classroomId),
  ],
);

/**
 * Sequência anual de matrículas por escola. Garante números de registro únicos
 * mesmo quando a secretaria cadastra alunos em paralelo.
 */
export const enrollmentSequences = sqliteTable(
  "enrollment_sequences",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    lastNumber: integer("last_number").notNull().default(0),
  },
  (table) => [
    uniqueIndex("enrollment_sequences_school_year_idx").on(
      table.schoolId,
      table.year,
    ),
  ],
);

/**
 * Alunos matriculados. A contagem do dashboard considera apenas ativos.
 * Os campos seguem o cadastro do Censo Escolar/INEP.
 */
export const students = sqliteTable(
  "students",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classroomId: text("classroom_id").references(() => classrooms.id, {
      onDelete: "set null",
    }),
    guardianUserId: text("guardian_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    enrollmentNumber: text("enrollment_number"),
    birthDate: text("birth_date"),
    cpf: text("cpf"),
    sex: text("sex", {
      enum: ["feminino", "masculino", "outro", "nao_informado"],
    }),
    birthCity: text("birth_city"),
    birthState: text("birth_state"),
    raceColor: text("race_color", {
      enum: ["branca", "preta", "parda", "amarela", "indigena", "nao_informado"],
    }),
    motherName: text("mother_name"),
    fatherName: text("father_name"),
    guardianName: text("guardian_name"),
    guardianCpf: text("guardian_cpf"),
    emergencyPhone: text("emergency_phone"),
    emergencyPhone2: text("emergency_phone_2"),
    zipCode: text("zip_code"),
    street: text("street"),
    number: text("number"),
    complement: text("complement"),
    neighborhood: text("neighborhood"),
    city: text("city"),
    state: text("state"),
    grade: text("grade"),
    shift: text("shift"),
    status: text("status", {
      enum: ["ativo", "transferido", "concluido"],
    })
      .notNull()
      .default("ativo"),
    birthCertificateStatus: text("birth_certificate_status", {
      enum: ["pendente", "validado"],
    })
      .notNull()
      .default("pendente"),
    schoolHistoryStatus: text("school_history_status", {
      enum: ["pendente", "validado"],
    })
      .notNull()
      .default("pendente"),
    residenceProofStatus: text("residence_proof_status", {
      enum: ["pendente", "validado"],
    })
      .notNull()
      .default("pendente"),
    docsStatus: text("docs_status", {
      enum: ["pendente", "validado"],
    })
      .notNull()
      .default("pendente"),
    docsValidatedBy: text("docs_validated_by"),
    docsValidatedAt: integer("docs_validated_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("students_school_id_idx").on(table.schoolId),
    index("students_classroom_id_idx").on(table.classroomId),
    index("students_guardian_user_id_idx").on(table.guardianUserId),
    uniqueIndex("students_school_enrollment_idx").on(
      table.schoolId,
      table.enrollmentNumber,
    ),
  ],
);

/** Solicitações de alteração cadastral feitas pelo responsável/aluno. */
export const studentUpdateRequests = sqliteTable(
  "student_update_requests",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pendente", "aprovado", "rejeitado"],
    })
      .notNull()
      .default("pendente"),
    payload: text("payload").notNull(),
    note: text("note"),
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("student_update_requests_school_id_idx").on(table.schoolId),
    index("student_update_requests_student_id_idx").on(table.studentId),
    index("student_update_requests_user_id_idx").on(table.userId),
  ],
);

/** Notas e frequência lançadas pelo professor da turma. */
export const studentAssessments = sqliteTable(
  "student_assessments",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    discipline: text("discipline").notNull(),
    assessment: text("assessment").notNull(),
    grade: real("grade").notNull(),
    presence: text("presence", { enum: ["presente", "falta"] })
      .notNull()
      .default("presente"),
    recordedBy: text("recorded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("student_assessments_school_id_idx").on(table.schoolId),
    index("student_assessments_student_id_idx").on(table.studentId),
  ],
);

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type SchoolMember = typeof schoolMembers.$inferSelect;
export type Student = typeof students.$inferSelect;
export type StudentUpdateRequest = typeof studentUpdateRequests.$inferSelect;
