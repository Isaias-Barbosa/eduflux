import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { schoolMembers } from "@/lib/db/schema";
import { isPlatformCreator } from "./creator";

export const SCHOOL_ROLES = [
  "owner",
  "admin",
  "secretaria",
  "auxiliar",
  "direcao",
  "professor",
  "responsavel",
] as const;

export type SchoolRole = (typeof SCHOOL_ROLES)[number];

export const ROLE_LABELS: Record<SchoolRole, string> = {
  owner: "Criador",
  admin: "Administrador / TI",
  secretaria: "Secretaria",
  auxiliar: "Auxiliar Administrativo",
  direcao: "Coordenação / Direção",
  professor: "Professor",
  responsavel: "Responsável / Aluno",
};

export const ROLE_DESCRIPTIONS: Record<SchoolRole, string> = {
  owner: "Acesso a todas as escolas da plataforma.",
  admin: "Acesso total: criar, editar, excluir e gerenciar permissões.",
  secretaria:
    "Criar, editar, matricular e transferir alunos; validar documentação e responder pelo Censo Escolar.",
  auxiliar:
    "Digitação inicial dos dados e atualização de telefones e endereços.",
  direcao: "Visualizar dados completos e emitir relatórios.",
  professor: "Visualizar a própria turma e lançar notas e frequência.",
  responsavel: "Visualizar o boletim e solicitar atualização cadastral.",
};

export const PERMISSIONS = [
  "school:read",
  "school:update",
  "member:read",
  "member:manage",
  "classroom:create",
  "teacher:read",
  "teacher:create",
  "student:read",
  "student:create",
  "student:update",
  "student:delete",
  "student:enroll",
  "student:transfer",
  "student:documents:validate",
  "student:export",
  "report:read",
  "update-request:read",
  "update-request:create",
  "update-request:review",
  "grade:read",
  "grade:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const FULL_ACCESS: Permission[] = [...PERMISSIONS];

const OPERATIONAL_ACCESS: Permission[] = [
  "school:read",
  "member:read",
  "teacher:read",
  "student:read",
  "student:create",
  "student:update",
  "student:enroll",
  "student:transfer",
  "student:documents:validate",
  "student:export",
  "report:read",
  "update-request:read",
  "update-request:review",
  "classroom:create",
];

/**
 * Matriz única de acesso. Rotas e interface usam a mesma fonte para evitar
 * que um botão apareça para um perfil que a API rejeita.
 */
export const ROLE_PERMISSIONS: Record<SchoolRole, readonly Permission[]> = {
  owner: FULL_ACCESS,
  admin: FULL_ACCESS,
  secretaria: OPERATIONAL_ACCESS,
  auxiliar: [
    "school:read",
    "member:read",
    "teacher:read",
    "student:read",
    "student:create",
    "student:update",
  ],
  direcao: [
    "school:read",
    "member:read",
    "teacher:read",
    "student:read",
    "report:read",
    "student:export",
    "update-request:read",
  ],
  professor: [
    "school:read",
    "student:read",
    "grade:read",
    "grade:write",
  ],
  responsavel: [
    "student:read",
    "grade:read",
    "update-request:read",
    "update-request:create",
  ],
};

export function roleHasPermission(
  role: SchoolRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export async function getSchoolRole(
  userId: string,
  schoolId: string,
): Promise<SchoolRole | null> {
  if (await isPlatformCreator(userId)) return "owner";

  const [membership] = await db
    .select({ role: schoolMembers.role })
    .from(schoolMembers)
    .where(
      and(
        eq(schoolMembers.userId, userId),
        eq(schoolMembers.schoolId, schoolId),
      ),
    )
    .limit(1);

  return membership?.role ?? null;
}

export async function hasPermission(
  userId: string,
  schoolId: string,
  permission: Permission,
): Promise<boolean> {
  const role = await getSchoolRole(userId, schoolId);
  return role !== null && roleHasPermission(role, permission);
}

export type SchoolCapabilities = Record<
  | "manageSchool"
  | "manageMembers"
  | "manageStudents"
  | "createClassrooms"
  | "createTeachers"
  | "createStudents"
  | "enrollStudents"
  | "transferStudents"
  | "reviewDocuments"
  | "exportStudents"
  | "viewReports"
  | "reviewRequests"
  | "requestUpdate"
  | "writeGrades",
  boolean
>;

export async function getSchoolCapabilities(
  userId: string,
  schoolId: string,
): Promise<SchoolCapabilities> {
  const role = await getSchoolRole(userId, schoolId);
  const can = (permission: Permission) =>
    role !== null && roleHasPermission(role, permission);

  return {
    manageSchool: can("school:update"),
    manageMembers: can("member:manage"),
    manageStudents: can("student:delete"),
    createClassrooms: can("classroom:create"),
    createTeachers: can("teacher:create"),
    createStudents: can("student:create"),
    enrollStudents: can("student:enroll"),
    transferStudents: can("student:transfer"),
    reviewDocuments: can("student:documents:validate"),
    exportStudents: can("student:export"),
    viewReports: can("report:read"),
    reviewRequests: can("update-request:review"),
    requestUpdate: can("update-request:create"),
    writeGrades: can("grade:write"),
  };
}
