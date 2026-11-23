import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuardianPanel } from "@/components/guardian-panel";
import { MyClassroomPanel } from "@/components/my-classroom-panel";
import { SchoolManagement } from "@/components/school-management";
import type {
  HistoryRecordItem,
  SchoolRules,
} from "@/components/school-types";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import {
  classrooms,
  schools,
  studentAssessments,
  studentOccurrences,
  studentTransferRecords,
  students,
  studentUpdateRequests,
  teacherAssignments,
  teacherStudents,
  teachers,
  schoolMembers,
} from "@/lib/db/schema";
import { canAccessSchool } from "@/lib/schools/access";
import { formatCep } from "@/lib/schools/cep";
import {
  getSchoolCapabilities,
  getSchoolRole,
  ROLE_LABELS,
} from "@/lib/schools/permissions";
import { SEGMENTS, getModules } from "@/lib/schools/segments";
import { canAccessStudent, getTeacherContext } from "@/lib/schools/student-scope";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function SchoolDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser();

  if (!(await canAccessSchool(session.user.id, id))) notFound();

  const role = await getSchoolRole(session.user.id, id);
  const capabilities = await getSchoolCapabilities(session.user.id, id);

  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, id))
    .limit(1);

  if (!school) notFound();

  const classroomRows = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.schoolId, id))
    .orderBy(asc(classrooms.name));

  const teacherRows = await db
    .select({ teacher: teachers, classroomName: classrooms.name })
    .from(teachers)
    .leftJoin(classrooms, eq(teachers.classroomId, classrooms.id))
    .where(eq(teachers.schoolId, id))
    .orderBy(asc(teachers.name));

  const teacherIds = teacherRows.map((row) => row.teacher.id);
  const assignmentRows =
    teacherIds.length > 0
      ? await db
          .select({
            id: teacherAssignments.id,
            teacherId: teacherAssignments.teacherId,
            classroomId: teacherAssignments.classroomId,
            classroomName: classrooms.name,
            discipline: teacherAssignments.discipline,
          })
          .from(teacherAssignments)
          .innerJoin(classrooms, eq(teacherAssignments.classroomId, classrooms.id))
          .where(inArray(teacherAssignments.teacherId, teacherIds))
          .orderBy(asc(classrooms.name), asc(teacherAssignments.discipline))
      : [];

  const assignmentIds = assignmentRows.map((row) => row.id);
  const assignmentStudentRows =
    assignmentIds.length > 0
      ? await db
          .select({
            assignmentId: teacherStudents.assignmentId,
            studentId: teacherStudents.studentId,
            studentName: students.name,
          })
          .from(teacherStudents)
          .innerJoin(students, eq(teacherStudents.studentId, students.id))
          .where(inArray(teacherStudents.assignmentId, assignmentIds))
      : [];

  const transferRows = await db
    .select()
    .from(studentTransferRecords)
    .where(eq(studentTransferRecords.schoolId, id))
    .orderBy(desc(studentTransferRecords.createdAt));

  const allStudentRows = await db
    .select({ student: students, classroomName: classrooms.name })
    .from(students)
    .leftJoin(classrooms, eq(students.classroomId, classrooms.id))
    .where(eq(students.schoolId, id))
    .orderBy(asc(students.name));

  const studentRows: Array<{
    student: typeof students.$inferSelect;
    classroomName: string | null;
  }> = [];
  for (const row of allStudentRows) {
    if (
      await canAccessStudent(session.user.id, id, row.student, role)
    ) {
      studentRows.push(row);
    }
  }

  const visibleStudentIds = studentRows.map((row) => row.student.id);
  const assessmentRows =
    visibleStudentIds.length > 0
      ? await db
          .select()
          .from(studentAssessments)
          .where(eq(studentAssessments.schoolId, id))
          .orderBy(asc(studentAssessments.createdAt))
      : [];

  const occurrenceRows =
    visibleStudentIds.length > 0
      ? await db
          .select()
          .from(studentOccurrences)
          .where(eq(studentOccurrences.schoolId, id))
          .orderBy(desc(studentOccurrences.occurrenceDate))
      : [];

  const memberRows = await db
    .select({
      id: schoolMembers.id,
      userId: schoolMembers.userId,
      role: schoolMembers.role,
      createdAt: schoolMembers.createdAt,
      name: user.name,
      email: user.email,
    })
    .from(schoolMembers)
    .innerJoin(user, eq(schoolMembers.userId, user.id))
    .where(eq(schoolMembers.schoolId, id))
    .orderBy(asc(user.name));

  const requestRows =
    role === "responsavel"
      ? await db
          .select({
            request: studentUpdateRequests,
            studentName: students.name,
            requesterName: user.name,
          })
          .from(studentUpdateRequests)
          .innerJoin(students, eq(studentUpdateRequests.studentId, students.id))
          .innerJoin(user, eq(studentUpdateRequests.userId, user.id))
          .where(
            and(
              eq(studentUpdateRequests.schoolId, id),
              eq(studentUpdateRequests.userId, session.user.id),
            ),
          )
          .orderBy(asc(studentUpdateRequests.createdAt))
      : await db
          .select({
            request: studentUpdateRequests,
            studentName: students.name,
            requesterName: user.name,
          })
          .from(studentUpdateRequests)
          .innerJoin(students, eq(studentUpdateRequests.studentId, students.id))
          .innerJoin(user, eq(studentUpdateRequests.userId, user.id))
          .where(eq(studentUpdateRequests.schoolId, id))
          .orderBy(asc(studentUpdateRequests.createdAt));

  const myTeacherContext =
    role === "professor"
      ? await getTeacherContext(session.user.id, id)
      : null;

  const segment = SEGMENTS[school.segment];
  const modules = getModules(school.segment);
  const rules: SchoolRules = {
    passingGrade: school.passingGrade,
    bimesters: school.bimesters,
    minFrequency: school.minFrequency,
    rotationModel: school.rotationModel,
    enabledModules: school.enabledModules,
  };
  const enabledModuleIds = new Set(
    rules.enabledModules.length > 0
      ? rules.enabledModules
      : modules.map((module) => module.id),
  );
  const address = [
    `${school.street}, ${school.number}`,
    school.complement,
    school.neighborhood,
    `${school.city}/${school.state}`,
    school.zipCode ? `CEP ${formatCep(school.zipCode)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const teacherItems = teacherRows.map(({ teacher, classroomName }) => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    discipline: teacher.discipline,
    classroomId: teacher.classroomId,
    classroomName,
    assignments: assignmentRows
      .filter((assignment) => assignment.teacherId === teacher.id)
      .map((assignment) => ({
        id: assignment.id,
        classroomId: assignment.classroomId,
        classroomName: assignment.classroomName,
        discipline: assignment.discipline,
        students: assignmentStudentRows
          .filter((link) => link.assignmentId === assignment.id)
          .map((link) => ({ id: link.studentId, name: link.studentName })),
      })),
  }));

  const transfersByStudent = new Map<string, HistoryRecordItem[]>();
  for (const record of transferRows) {
    const list = transfersByStudent.get(record.studentId) ?? [];
    list.push({
      id: record.id,
      destinationSchool: record.destinationSchool,
      transferDate: record.transferDate,
      reason: record.reason,
      note: record.note,
      historyIssuedAt: record.historyIssuedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    });
    transfersByStudent.set(record.studentId, list);
  }

  const studentItems = studentRows.map(({ student, classroomName }) => ({
    id: student.id,
    name: student.name,
    enrollmentNumber: student.enrollmentNumber,
    birthDate: student.birthDate,
    cpf: student.cpf,
    sex: student.sex,
    birthCity: student.birthCity,
    birthState: student.birthState,
    raceColor: student.raceColor,
    motherName: student.motherName,
    fatherName: student.fatherName,
    guardianName: student.guardianName,
    guardianCpf: student.guardianCpf,
    guardianUserId: student.guardianUserId,
    emergencyPhone: student.emergencyPhone,
    emergencyPhone2: student.emergencyPhone2,
    zipCode: student.zipCode,
    street: student.street,
    number: student.number,
    complement: student.complement,
    neighborhood: student.neighborhood,
    city: student.city,
    state: student.state,
    grade: student.grade,
    shift: student.shift,
    status: student.status,
    classroomId: student.classroomId,
    classroomName,
    birthCertificateStatus: student.birthCertificateStatus,
    schoolHistoryStatus: student.schoolHistoryStatus,
    residenceProofStatus: student.residenceProofStatus,
    docsStatus: student.docsStatus,
    transferRecords: transfersByStudent.get(student.id) ?? [],
  }));

  const assessmentItems = assessmentRows
    .filter((item) => visibleStudentIds.includes(item.studentId))
    .map((item) => ({
      id: item.id,
      studentId: item.studentId,
      discipline: item.discipline,
      assessment: item.assessment,
      grade: item.grade,
      bimester: item.bimester,
      weight: item.weight,
      assessmentType: item.assessmentType,
      presence: item.presence,
      createdAt: item.createdAt.toISOString(),
    }));

  const requestItems = requestRows.map(({ request, studentName, requesterName }) => ({
    id: request.id,
    studentId: request.studentId,
    studentName,
    status: request.status,
    note: request.note,
    payload: request.payload,
    reviewNote: request.reviewNote,
    createdAt: request.createdAt.toISOString(),
    requesterName,
  }));

  const occurrenceItems = occurrenceRows
    .filter((item) => visibleStudentIds.includes(item.studentId))
    .map((item) => ({
      id: item.id,
      studentId: item.studentId,
      occurrenceDate: item.occurrenceDate,
      type: item.type,
      severity: item.severity,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
    }));

  const activeStudents = studentItems.filter(
    (student) => student.status === "ativo",
  ).length;

  const scopedRole = role === "professor" || role === "responsavel";
  const studentCardLabel =
    role === "professor"
      ? "Alunos da minha turma"
      : role === "responsavel"
        ? "Meus alunos"
        : "Total de Alunos Matriculados";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="size-4" />
        Voltar para minhas escolas
      </Link>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            <BadgeCheck className="size-3.5" />
            Configuração concluída
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {school.name}
          </h1>
          <p className="mt-1 text-sm text-emerald-800">
            Segmento: {segment.label} · {segment.audience}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700">
            Identificador: {school.slug}
          </span>
          {role && (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {ROLE_LABELS[role]}
            </span>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${scopedRole ? "sm:grid-cols-1" : "sm:grid-cols-3"}`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users className="size-4 text-emerald-600" />
            {studentCardLabel}
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{activeStudents}</p>
          <p className="mt-1 text-xs text-slate-500">Matrículas ativas</p>
        </div>
        {!scopedRole && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <GraduationCap className="size-4 text-emerald-600" />
                Total de Professores
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {teacherRows.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Usuários com perfil de professor
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <DoorOpen className="size-4 text-emerald-600" />
                Salas de aula
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {classroomRows.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Turmas cadastradas</p>
            </div>
          </>
        )}
      </div>

      {role === "professor" ? (
        <MyClassroomPanel
          schoolId={id}
          teacherName={myTeacherContext?.name ?? session.user.name}
          assignments={myTeacherContext?.assignments ?? []}
          students={studentItems}
          assessments={assessmentItems}
          occurrences={occurrenceItems}
          rules={rules}
          capabilities={capabilities}
        />
      ) : role === "responsavel" ? (
        <GuardianPanel
          schoolId={id}
          students={studentItems}
          requests={requestItems}
          assessments={assessmentItems}
          rules={rules}
        />
      ) : (
        <SchoolManagement
          schoolId={id}
          segment={school.segment}
          rules={rules}
          capabilities={capabilities}
          profile={{
            directorName: school.directorName ?? "",
            directorEmail: school.directorEmail ?? "",
            directorPhone: school.directorPhone ?? "",
            pedagogicalCoordinator: school.pedagogicalCoordinator ?? "",
            secretaryName: school.secretaryName ?? "",
            shifts: school.shifts,
            classrooms: school.classrooms?.toString() ?? "",
            facilities: school.facilities,
            passingGrade: school.passingGrade.toString(),
            bimesters: school.bimesters.toString(),
            minFrequency: school.minFrequency.toString(),
            rotationModel: school.rotationModel,
            enabledModules: school.enabledModules,
          }}
          initial={{
            classrooms: classroomRows,
            teachers: teacherItems,
            students: studentItems,
            members: memberRows.map((member) => ({
              id: member.id,
              userId: member.userId,
              name: member.name,
              email: member.email,
              role: member.role,
              createdAt: member.createdAt.toISOString(),
            })),
            requests: requestItems,
            assessments: assessmentItems,
          }}
        />
      )}

      {!scopedRole && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Building2 className="size-4 text-emerald-600" />
                Dados da instituição
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Endereço</dt>
                  <dd className="mt-0.5 flex items-start gap-2 text-slate-700">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    {address}
                  </dd>
                </div>
                {school.phone && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="size-4 text-slate-400" />
                    {school.phone}
                  </div>
                )}
                {school.email && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="size-4 text-slate-400" />
                    {school.email}
                  </div>
                )}
                {school.legalName && (
                  <div>
                    <dt className="text-xs text-slate-500">Razão Social</dt>
                    <dd className="mt-0.5 text-slate-700">{school.legalName}</dd>
                  </div>
                )}
                {school.inepCode && (
                  <div>
                    <dt className="text-xs text-slate-500">Código INEP</dt>
                    <dd className="mt-0.5 text-slate-700">{school.inepCode}</dd>
                  </div>
                )}
                {school.foundedYear && (
                  <div>
                    <dt className="text-xs text-slate-500">Ano de fundação</dt>
                    <dd className="mt-0.5 text-slate-700">{school.foundedYear}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserRound className="size-4 text-emerald-600" />
                Equipe pedagógica cadastrada
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Diretora Geral</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {school.directorName || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Coordenador Pedagógico</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {school.pedagogicalCoordinator || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Secretaria Escolar</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {school.secretaryName || "Não informado"}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ClipboardList className="size-4 text-emerald-600" />
              Infraestrutura e Números
            </h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Turnos de funcionamento</dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {school.shifts.length ? school.shifts.join(", ") : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Salas de aula</dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {school.classrooms ?? "—"}
                </dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-xs text-slate-500">Dependências</dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {school.facilities.length ? school.facilities.join(", ") : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Módulos deste segmento
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Disponíveis para {segment.label.toLowerCase()}; o administrador
                  escolhe quais ficam ativos.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {modules.filter((module) => enabledModuleIds.has(module.id)).length}/
                {modules.length} ativos
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {modules.map((module) => {
                const enabled = enabledModuleIds.has(module.id);
                return (
                <div
                  key={module.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    enabled ? "border-slate-200" : "border-slate-100 bg-slate-50/60"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                      enabled
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {enabled ? <Check className="size-3" /> : <Lock className="size-3" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {module.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {module.description}
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
