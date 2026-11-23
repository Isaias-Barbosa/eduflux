import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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
    role: text("role", { enum: ["admin", "secretaria", "professor"] })
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

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type SchoolMember = typeof schoolMembers.$inferSelect;
