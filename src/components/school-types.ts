import type { SchoolCapabilities } from "@/lib/schools/permissions";

export type { SchoolCapabilities };

export type ClassroomItem = {
  id: string;
  name: string;
  shift: string | null;
};

export type TeacherItem = {
  id: string;
  name: string;
  email: string;
  discipline: string;
  classroomId: string | null;
  classroomName: string | null;
};

export type StudentItem = {
  id: string;
  name: string;
  enrollmentNumber: string | null;
  birthDate: string | null;
  cpf: string | null;
  sex: string | null;
  birthCity: string | null;
  birthState: string | null;
  raceColor: string | null;
  motherName: string | null;
  fatherName: string | null;
  guardianName: string | null;
  guardianCpf: string | null;
  guardianUserId: string | null;
  emergencyPhone: string | null;
  emergencyPhone2: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  grade: string | null;
  shift: string | null;
  status: "ativo" | "transferido" | "concluido";
  classroomId: string | null;
  classroomName: string | null;
  birthCertificateStatus: "pendente" | "validado";
  schoolHistoryStatus: "pendente" | "validado";
  residenceProofStatus: "pendente" | "validado";
  docsStatus: "pendente" | "validado";
};

export type AssessmentItem = {
  id: string;
  studentId: string;
  discipline: string;
  assessment: string;
  grade: number;
  presence: "presente" | "falta";
  createdAt: string;
};

export type MemberItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export type UpdateRequestItem = {
  id: string;
  studentId: string;
  studentName: string;
  status: "pendente" | "aprovado" | "rejeitado";
  note: string | null;
  payload: string;
  reviewNote: string | null;
  createdAt: string;
  requesterName: string;
};

export type ProfileForm = {
  directorName: string;
  directorEmail: string;
  directorPhone: string;
  pedagogicalCoordinator: string;
  secretaryName: string;
  shifts: string[];
  classrooms: string;
  facilities: string[];
};
