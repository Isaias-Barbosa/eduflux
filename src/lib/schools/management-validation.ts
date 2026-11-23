import { z } from "zod";

import { onlyDigits } from "./cep";
import { FACILITY_OPTIONS, SHIFT_OPTIONS } from "./options";
import { SCHOOL_MODULE_IDS } from "./segments";

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
const rotationValues = ["alunos", "professor"] as const;
const occurrenceTypeValues = [
  "pedagogica",
  "disciplinar",
  "frequencia",
  "saude",
  "outro",
] as const;
const occurrenceSeverityValues = ["baixa", "media", "alta"] as const;
const assessmentTypeValues = [
  "avaliacao",
  "recuperacao",
  "trabalho",
  "prova",
] as const;

const isoDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime());
  }, "Data inválida");

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
  bimester: z.coerce
    .number("Informe o bimestre")
    .int("Bimestre inválido")
    .min(1, "Bimestre mínimo: 1")
    .max(6, "Bimestre máximo: 6")
    .default(1),
  weight: z.coerce
    .number("Informe o peso")
    .min(0.1, "Peso mínimo: 0,1")
    .max(10, "Peso máximo: 10")
    .default(1),
  assessmentType: z.enum(assessmentTypeValues).default("avaliacao"),
  presence: z.enum(["presente", "falta"]).default("presente"),
});

export const updateAssessmentSchema = createAssessmentSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Informe ao menos um campo para atualizar",
);

export const createOccurrenceSchema = z.object({
  occurrenceDate: isoDateField,
  type: z.enum(occurrenceTypeValues).default("pedagogica"),
  severity: z.enum(occurrenceSeverityValues).default("baixa"),
  description: requiredText("Descrição da ocorrência", 1000),
});

export const reviewDocumentsSchema = z.object({
  birthCertificateStatus: z.enum(documentStatusValues),
  schoolHistoryStatus: z.enum(documentStatusValues),
  residenceProofStatus: z.enum(documentStatusValues),
});

export const transferStudentSchema = z
  .object({
    status: z.enum(["transferido", "concluido"]),
    classroomId: z.string().trim().nullable().default(null),
    note: optionalRawText(255),
    destinationSchool: optionalRawText(160),
    transferDate: z.union([z.literal(""), isoDateField]).default(""),
    reason: optionalRawText(500),
    issueHistory: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.status === "transferido" && !value.destinationSchool?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["destinationSchool"],
        message: "Informe a escola de destino na transferência.",
      });
    }
  });

const capacityField = z.coerce
  .number("Informe a capacidade")
  .int("Capacidade inválida")
  .min(1, "Capacidade mínima: 1")
  .max(500, "Capacidade máxima: 500");

const schoolYearField = z.coerce
  .number("Informe o ano letivo")
  .int("Ano letivo inválido")
  .min(2000, "Ano letivo mínimo: 2000")
  .max(2100, "Ano letivo máximo: 2100");

export const createClassroomSchema = z.object({
  name: requiredText("Nome da turma", 80),
  grade: requiredText("Série/ano", 40),
  shift: z.enum(SHIFT_OPTIONS),
  schoolYear: schoolYearField.default(new Date().getFullYear()),
  capacity: capacityField.default(25),
  physicalRoomId: z.union([z.literal(""), z.string().trim()]).default(""),
});

export const updateClassroomSchema = createClassroomSchema.partial().extend({
  status: z.enum(["aberta", "fechada"]).optional(),
});

export const generateClassroomsSchema = z.object({
  grade: requiredText("Série/ano", 40),
  shift: z.enum(SHIFT_OPTIONS),
  quantity: z.coerce
    .number("Informe a quantidade")
    .int("Quantidade inválida")
    .min(1, "Mínimo de 1 turma")
    .max(60, "Máximo de 60 turmas"),
  schoolYear: schoolYearField.default(new Date().getFullYear()),
  capacity: capacityField.default(25),
  physicalRoomId: z.union([z.literal(""), z.string().trim()]).default(""),
});

export const createPhysicalRoomSchema = z.object({
  name: requiredText("Nome da sala física", 80),
  squareMeters: z.coerce
    .number("Informe a metragem")
    .min(0, "Metragem inválida")
    .max(10000, "Metragem inválida")
    .nullable()
    .default(null),
  capacity: capacityField.default(25),
});

export const updatePhysicalRoomSchema = createPhysicalRoomSchema.partial();

export const createWaitlistSchema = z.object({
  studentId: requiredText("Aluno", 120),
  classroomId: z.union([z.literal(""), z.string().trim()]).default(""),
  discipline: optionalText(120),
  note: optionalRawText(255),
});

export const updateWaitlistSchema = z.object({
  status: z.enum(["aguardando", "atendido", "cancelado"]),
});

/**
 * Cada vínculo representa uma turma/disciplina e os alunos atendidos nela.
 * `classroomId` e `discipline` isolados são mantidos para compatibilidade com
 * o formulário anterior; quando não há vínculos, um é derivado deles.
 */
export const teacherAssignmentSchema = z.object({
  classroomId: requiredText("Turma do professor", 120),
  discipline: optionalText(120),
  studentIds: z.array(z.string().trim()).default([]),
  capacity: capacityField.default(25),
});

export const createTeacherSchema = z.object({
  name: requiredText("Nome do professor"),
  email: z.string().trim().email("E-mail inválido"),
  discipline: optionalText(120),
  classroomId: z.union([z.literal(""), z.string().trim()]).default(""),
  assignments: z.array(teacherAssignmentSchema).default([]),
});

export const updateTeacherSchema = z.object({
  name: requiredText("Nome do professor").optional(),
  email: z.string().trim().email("E-mail inválido").optional(),
  assignments: z.array(teacherAssignmentSchema).optional(),
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
  passingGrade: z.coerce
    .number("Informe a média de aprovação")
    .min(0, "Média mínima: 0")
    .max(10, "Média máxima: 10")
    .default(6),
  bimesters: z.coerce
    .number("Informe a quantidade de bimestres")
    .int("Bimestre inválido")
    .min(1, "Mínimo de 1 bimestre")
    .max(6, "Máximo de 6 bimestres")
    .default(4),
  minFrequency: z.coerce
    .number("Informe a frequência mínima")
    .min(0, "Frequência mínima: 0")
    .max(100, "Frequência máxima: 100")
    .default(75),
  rotationModel: z.enum(rotationValues).default("alunos"),
  enabledModules: z.array(z.enum([...SCHOOL_MODULE_IDS])).default([]),
});
