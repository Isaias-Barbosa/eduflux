import { z } from "zod";

import { onlyDigits } from "./cep";
import { FACILITY_OPTIONS, SHIFT_OPTIONS } from "./options";

const requiredText = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`)
    .max(max, `${label} é muito longo`);

const optionalText = (max = 255) =>
  z.string().trim().max(max, "Texto muito longo").default("");

const optionalRawText = (max = 255) =>
  z.string().trim().max(max, "Texto muito longo").optional();

const ufField = z
  .string()
  .trim()
  .length(2, "Informe a sigla do estado (UF)")
  .transform((value) => value.toUpperCase());

const zipCodeField = z
  .string()
  .trim()
  .transform(onlyDigits)
  .pipe(z.string().regex(/^\d{8}$/, "CEP deve conter 8 dígitos"));

function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;

  const digit = (length: number) => {
    const sum = value
      .slice(0, length)
      .split("")
      .reduce((total, part, index) => total + Number(part) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
}

const cpfField = z
  .string()
  .trim()
  .transform(onlyDigits)
  .pipe(z.string().regex(/^(\d{11})?$/, "CPF deve conter 11 dígitos"))
  .refine((value) => !value || isValidCpf(value), "CPF inválido");

const birthDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de nascimento")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date <= new Date();
  }, "Data de nascimento inválida");

const sexValues = ["feminino", "masculino", "outro", "nao_informado"] as const;
const raceValues = [
  "branca",
  "preta",
  "parda",
  "amarela",
  "indigena",
  "nao_informado",
] as const;
const statusValues = ["ativo", "transferido", "concluido"] as const;
const documentStatusValues = ["pendente", "validado"] as const;

export const STUDENT_SEX_OPTIONS = sexValues;
export const STUDENT_RACE_OPTIONS = raceValues;
export const STUDENT_STATUS_OPTIONS = statusValues;
export const DOCUMENT_STATUS_OPTIONS = documentStatusValues;
export const STUDENT_SHIFT_OPTIONS = SHIFT_OPTIONS;

const studentFields = {
  name: requiredText("Nome do aluno"),
  birthDate: birthDateField,
  cpf: cpfField,
  sex: z.enum(sexValues),
  birthCity: requiredText("Naturalidade (cidade)", 80),
  birthState: ufField,
  raceColor: z.enum(raceValues),
  motherName: requiredText("Nome da mãe"),
  fatherName: optionalRawText(120),
  guardianName: requiredText("Nome do responsável"),
  guardianCpf: cpfField.refine(
    (value) => value.length === 11,
    "CPF do responsável é obrigatório",
  ),
  emergencyPhone: requiredText("Telefone de emergência", 20),
  emergencyPhone2: optionalRawText(20),
  zipCode: zipCodeField,
  street: requiredText("Rua ou avenida", 160),
  number: requiredText("Número", 20),
  complement: optionalRawText(80),
  neighborhood: requiredText("Bairro", 80),
  city: requiredText("Cidade", 80),
  state: ufField,
  grade: requiredText("Ano/série", 40),
  shift: z.enum(SHIFT_OPTIONS),
};

export const createStudentSchema = z.object({
  ...studentFields,
  classroomId: z.union([z.literal(""), z.string().trim()]).default(""),
  guardianUserId: z.union([z.literal(""), z.string().trim()]).default(""),
  status: z.enum(statusValues).default("ativo"),
  birthCertificateStatus: z.enum(documentStatusValues).default("pendente"),
  schoolHistoryStatus: z.enum(documentStatusValues).default("pendente"),
  residenceProofStatus: z.enum(documentStatusValues).default("pendente"),
});

export const updateStudentSchema = z.object(studentFields).partial().extend({
  classroomId: z.string().trim().nullable().optional(),
  guardianUserId: z.string().trim().nullable().optional(),
  status: z.enum(statusValues).optional(),
  birthCertificateStatus: z.enum(documentStatusValues).optional(),
  schoolHistoryStatus: z.enum(documentStatusValues).optional(),
  residenceProofStatus: z.enum(documentStatusValues).optional(),
});

export const createAssessmentSchema = z.object({
  discipline: requiredText("Disciplina", 120),
  assessment: requiredText("Avaliação", 120),
  grade: z.coerce
    .number("Informe a nota")
    .min(0, "Nota mínima: 0")
    .max(10, "Nota máxima: 10"),
  presence: z.enum(["presente", "falta"]).default("presente"),
});

export const reviewDocumentsSchema = z.object({
  birthCertificateStatus: z.enum(documentStatusValues),
  schoolHistoryStatus: z.enum(documentStatusValues),
  residenceProofStatus: z.enum(documentStatusValues),
});

export const transferStudentSchema = z.object({
  status: z.enum(["transferido", "concluido"]),
  classroomId: z.string().trim().nullable().default(null),
  note: optionalRawText(255),
});

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

export const schoolRoleValues = [
  "admin",
  "secretaria",
  "auxiliar",
  "direcao",
  "professor",
  "responsavel",
] as const;

export const addMemberSchema = z.object({
  name: requiredText("Nome"),
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(schoolRoleValues),
  temporaryPassword: optionalRawText(120),
});

export const updateMemberSchema = z.object({
  role: z.enum(schoolRoleValues),
});

export const studentUpdateRequestSchema = z.object({
  note: requiredText("Descreva o que deseja alterar", 500),
  payload: z.record(z.string(), z.string()).default({}),
});

export const reviewUpdateRequestSchema = z.object({
  decision: z.enum(["aprovado", "rejeitado"]),
  reviewNote: optionalRawText(500),
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
