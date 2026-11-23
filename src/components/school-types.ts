import type { SchoolCapabilities } from "@/lib/schools/permissions";
import type { SchoolModuleId } from "@/lib/schools/segments";

export type { SchoolCapabilities };

export type ClassroomItem = {
  id: string;
  name: string;
  grade: string | null;
  shift: string | null;
  schoolYear: number;
  capacity: number;
  occupied: number;
  seatsLeft: number;
  status: "aberta" | "fechada";
  physicalRoomId: string | null;
  physicalRoomName: string | null;
  physicalRoomCapacity: number | null;
};

export type PhysicalRoomItem = {
  id: string;
  name: string;
  squareMeters: number | null;
  capacity: number;
  classroomCount: number;
};

export type WaitlistItem = {
  id: string;
  studentId: string;
  studentName: string;
  grade: string | null;
  shift: string | null;
  classroomId: string | null;
  classroomName: string | null;
  discipline: string;
  note: string | null;
  status: "aguardando" | "atendido" | "cancelado";
  schoolYear: number;
  createdAt: string;
};

export type TeacherAssignmentItem = {
  id: string;
  classroomId: string;
  classroomName: string;
  discipline: string;
  capacity: number;
  students: Array<{ id: string; name: string }>;
};

export type TeacherItem = {
  id: string;
  name: string;
  email: string;
  discipline: string;
  classroomId: string | null;
  classroomName: string | null;
  assignments: TeacherAssignmentItem[];
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
  transferRecords: HistoryRecordItem[];
};

export type AssessmentItem = {
  id: string;
  studentId: string;
  discipline: string;
  assessment: string;
  grade: number;
  bimester: number;
  weight: number;
  assessmentType: "avaliacao" | "recuperacao" | "trabalho" | "prova";
  presence: "presente" | "falta";
  createdAt: string;
};

export type OccurrenceItem = {
  id: string;
  studentId: string;
  occurrenceDate: string;
  type: "pedagogica" | "disciplinar" | "frequencia" | "saude" | "outro";
  severity: "baixa" | "media" | "alta";
  description: string;
  createdAt: string;
};

export type HistoryRecordItem = {
  id: string;
  destinationSchool: string;
  transferDate: string;
  reason: string | null;
  note: string | null;
  historyIssuedAt: string | null;
  createdAt: string;
};

export type SchoolRules = {
  passingGrade: number;
  bimesters: number;
  minFrequency: number;
  rotationModel: "alunos" | "professor";
  enabledModules: SchoolModuleId[];
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
  administrativeDependency: "publica" | "privada";
  maintainerName: string;
  directorName: string;
  directorEmail: string;
  directorPhone: string;
  pedagogicalCoordinator: string;
  secretaryName: string;
  shifts: string[];
  classrooms: string;
  facilities: string[];
  passingGrade: string;
  bimesters: string;
  minFrequency: string;
  rotationModel: "alunos" | "professor";
  enabledModules: SchoolModuleId[];
};
