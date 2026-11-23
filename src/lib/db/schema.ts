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
import type { SchoolModuleId, SchoolSegment } from "@/lib/schools/segments";

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
    /**
     * Regras pedagógicas configuráveis pelo administrador da escola.
     * `enabledModules` vazio significa "todos os módulos do segmento".
     */
    passingGrade: real("passing_grade").notNull().default(6),
    bimesters: integer("bimesters").notNull().default(4),
    minFrequency: real("min_frequency").notNull().default(75),
    rotationModel: text("rotation_model", { enum: ["alunos", "professor"] })
      .notNull()
      .default("alunos"),
    enabledModules: text("enabled_modules", { mode: "json" })
      .$type<SchoolModuleId[]>()
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

/** Espaço físico real (sala, laboratório), independente da turma pedagógica. */
export const physicalRooms = sqliteTable(
  "physical_rooms",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    squareMeters: real("square_meters"),
    capacity: integer("capacity").notNull().default(25),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("physical_rooms_school_name_idx").on(table.schoolId, table.name),
    index("physical_rooms_school_id_idx").on(table.schoolId),
  ],
);

/** Turma: agrupamento pedagógico que pode ocupar um espaço físico por turno. */
export const classrooms = sqliteTable(
  "classrooms",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    schoolYear: integer("school_year").notNull().default(2026),
    grade: text("grade"),
    shift: text("shift"),
    /** Vagas ofertadas pela turma. */
    capacity: integer("capacity").notNull().default(25),
    physicalRoomId: text("physical_room_id").references(() => physicalRooms.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: ["aberta", "fechada"] })
      .notNull()
      .default("aberta"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("classrooms_school_name_idx").on(
      table.schoolId,
      table.schoolYear,
      table.name,
    ),
    index("classrooms_school_id_idx").on(table.schoolId),
    index("classrooms_physical_room_id_idx").on(table.physicalRoomId),
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
 * Vínculo de um professor com uma sala e uma disciplina. Um professor pode
 * lecionar em várias salas e um aluno pode ter vários professores.
 */
export const teacherAssignments = sqliteTable(
  "teacher_assignments",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    classroomId: text("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    discipline: text("discipline").notNull().default(""),
    /** Limite de alunos desta disciplina nesta turma com este professor. */
    capacity: integer("capacity").notNull().default(25),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("teacher_assignments_unique_idx").on(
      table.teacherId,
      table.classroomId,
      table.discipline,
    ),
    index("teacher_assignments_school_id_idx").on(table.schoolId),
    index("teacher_assignments_teacher_id_idx").on(table.teacherId),
    index("teacher_assignments_classroom_id_idx").on(table.classroomId),
  ],
);

/** Alunos atendidos em cada vínculo professor/sala/disciplina. */
export const teacherStudents = sqliteTable(
  "teacher_students",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => teacherAssignments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("teacher_students_unique_idx").on(
      table.assignmentId,
      table.studentId,
    ),
    index("teacher_students_school_id_idx").on(table.schoolId),
    index("teacher_students_student_id_idx").on(table.studentId),
  ],
);

/** Alunos aguardando vaga em uma turma/disciplina (ou nova turma). */
export const classroomWaitlist = sqliteTable(
  "classroom_waitlist",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classroomId: text("classroom_id").references(() => classrooms.id, {
      onDelete: "cascade",
    }),
    discipline: text("discipline").notNull().default(""),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    schoolYear: integer("school_year").notNull().default(2026),
    note: text("note"),
    status: text("status", { enum: ["aguardando", "atendido", "cancelado"] })
      .notNull()
      .default("aguardando"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("classroom_waitlist_school_id_idx").on(table.schoolId),
    index("classroom_waitlist_classroom_id_idx").on(table.classroomId),
    index("classroom_waitlist_student_id_idx").on(table.studentId),
  ],
);

/** Ocorrências pedagógicas e disciplinares registradas pelos professores. */
export const studentOccurrences = sqliteTable(
  "student_occurrences",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    assignmentId: text("assignment_id").references(() => teacherAssignments.id, {
      onDelete: "set null",
    }),
    occurrenceDate: text("occurrence_date").notNull(),
    type: text("type", {
      enum: ["pedagogica", "disciplinar", "frequencia", "saude", "outro"],
    })
      .notNull()
      .default("pedagogica"),
    severity: text("severity", { enum: ["baixa", "media", "alta"] })
      .notNull()
      .default("baixa"),
    description: text("description").notNull(),
    recordedBy: text("recorded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("student_occurrences_school_id_idx").on(table.schoolId),
    index("student_occurrences_student_id_idx").on(table.studentId),
  ],
);

/** Saídas do aluno e o histórico escolar emitido pela secretaria. */
export const studentTransferRecords = sqliteTable(
  "student_transfer_records",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    destinationSchool: text("destination_school").notNull().default(""),
    transferDate: text("transfer_date").notNull(),
    reason: text("reason"),
    note: text("note"),
    historySnapshot: text("history_snapshot", { mode: "json" }).$type<
      Record<string, unknown> | null
    >(),
    historyIssuedAt: integer("history_issued_at", { mode: "timestamp_ms" }),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("student_transfer_records_school_id_idx").on(table.schoolId),
    index("student_transfer_records_student_id_idx").on(table.studentId),
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
    bimester: integer("bimester").notNull().default(1),
    weight: real("weight").notNull().default(1),
    assessmentType: text("assessment_type", {
      enum: ["avaliacao", "recuperacao", "trabalho", "prova"],
    })
      .notNull()
      .default("avaliacao"),
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
    index("student_assessments_bimester_idx").on(table.schoolId, table.bimester),
  ],
);

/** Log de auditoria das ações administrativas da escola. */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("audit_logs_school_id_idx").on(table.schoolId),
    index("audit_logs_created_at_idx").on(table.schoolId, table.createdAt),
  ],
);

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type SchoolMember = typeof schoolMembers.$inferSelect;
export type Student = typeof students.$inferSelect;
export type StudentUpdateRequest = typeof studentUpdateRequests.$inferSelect;
export type TeacherAssignment = typeof teacherAssignments.$inferSelect;
export type TeacherStudent = typeof teacherStudents.$inferSelect;
export type StudentOccurrence = typeof studentOccurrences.$inferSelect;
export type StudentTransferRecord = typeof studentTransferRecords.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
