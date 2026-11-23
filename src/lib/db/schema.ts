import { sql } from "drizzle-orm";
import {
  index,
  integer,
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
      enum: ["owner", "admin", "secretaria", "professor"],
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

/** Alunos matriculados. A contagem do dashboard considera apenas ativos. */
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
    name: text("name").notNull(),
    status: text("status", { enum: ["ativo", "inativo"] })
      .notNull()
      .default("ativo"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("students_school_id_idx").on(table.schoolId),
    index("students_classroom_id_idx").on(table.classroomId),
  ],
);

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type SchoolMember = typeof schoolMembers.$inferSelect;
