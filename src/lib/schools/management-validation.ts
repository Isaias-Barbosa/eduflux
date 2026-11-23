import { z } from "zod";

import { FACILITY_OPTIONS, SHIFT_OPTIONS } from "./options";

const requiredText = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`)
    .max(max, `${label} é muito longo`);

const optionalText = (max = 255) =>
  z.string().trim().max(max, "Texto muito longo").default("");

export const createClassroomSchema = z.object({
  name: requiredText("Nome da sala", 80),
  shift: optionalText(40),
});

export const createTeacherSchema = z.object({
  name: requiredText("Nome do professor"),
  email: z.string().trim().email("E-mail inválido"),
  discipline: optionalText(120),
  classroomId: z.union([z.literal(""), z.string().trim()]).default(""),
});

export const createStudentSchema = z.object({
  name: requiredText("Nome do aluno"),
  classroomId: z.union([z.literal(""), z.string().trim()]).default(""),
});

export const updateSchoolProfileSchema = z.object({
  directorName: optionalText(120),
  directorEmail: z
    .union([z.literal(""), z.string().trim().email("E-mail inválido")])
    .default(""),
  directorPhone: z.string().trim().max(20, "Telefone muito longo").default(""),
  pedagogicalCoordinator: optionalText(120),
  secretaryName: optionalText(120),
  shifts: z.array(z.enum([...SHIFT_OPTIONS])).default([]),
  classrooms: z
    .string()
    .trim()
    .regex(/^(\d{1,4})?$/, "Número de salas inválido")
    .default(""),
  facilities: z.array(z.enum([...FACILITY_OPTIONS])).default([]),
});
