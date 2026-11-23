"use client";

import {
  Clipboard,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FACILITY_OPTIONS, SHIFT_OPTIONS } from "@/lib/schools/options";
import { getModules, type SchoolSegment } from "@/lib/schools/segments";
import { AuditPanel } from "./audit-panel";
import { MembersPanel } from "./members-panel";
import { StudentsPanel } from "./students-panel";
import { UpdateRequestsPanel } from "./update-requests-panel";
import type {
  AssessmentItem,
  ClassroomItem,
  MemberItem,
  PhysicalRoomItem,
  ProfileForm,
  SchoolCapabilities,
  SchoolRules,
  StudentItem,
  TeacherAssignmentItem,
  TeacherItem,
  UpdateRequestItem,
  WaitlistItem,
} from "./school-types";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60";

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function CheckGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: ReadonlyArray<{ id: T; name: string }> | readonly T[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  const normalized = options.map((option) =>
    typeof option === "string"
      ? { id: option, name: option }
      : { id: option.id, name: option.name },
  );

  function toggle(option: T) {
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {normalized.map((option) => {
          const selected = value.includes(option.id);
          return (
            <label
              key={option.id}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                selected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(option.id)}
                className="size-4 accent-emerald-600"
              />
              {option.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type AssignmentForm = {
  classroomId: string;
  discipline: string;
  studentIds: string[];
  capacity: string;
};

const emptyAssignment = (): AssignmentForm => ({
  classroomId: "",
  discipline: "",
  studentIds: [],
  capacity: "25",
});

type Props = {
  schoolId: string;
  segment: SchoolSegment;
  rules: SchoolRules;
  profile: ProfileForm;
  capabilities: SchoolCapabilities;
  initial: {
    classrooms: ClassroomItem[];
    physicalRooms: PhysicalRoomItem[];
    waitlist: WaitlistItem[];
    teachers: TeacherItem[];
    students: StudentItem[];
    members: MemberItem[];
    requests: UpdateRequestItem[];
    assessments: AssessmentItem[];
  };
};

export function SchoolManagement({
  schoolId,
  segment,
  rules,
  profile,
  capabilities,
  initial,
}: Props) {
  const router = useRouter();
  const [profileForm, setProfileForm] = useState<ProfileForm>(profile);
  const classrooms = initial.classrooms;
  const physicalRooms = initial.physicalRooms;
  const [waitlist, setWaitlist] = useState(initial.waitlist);
  const [teachers, setTeachers] = useState(initial.teachers);
  const [classroomForm, setClassroomForm] = useState({
    name: "",
    grade: "",
    shift: "Matutino",
    schoolYear: String(new Date().getFullYear()),
    capacity: "25",
    physicalRoomId: "",
  });
  const [generatorForm, setGeneratorForm] = useState({
    grade: "",
    shift: "Matutino",
    quantity: "24",
    schoolYear: String(new Date().getFullYear()),
    capacity: "25",
    physicalRoomId: "",
  });
  const [physicalRoomForm, setPhysicalRoomForm] = useState({
    name: "",
    squareMeters: "",
    capacity: "25",
  });
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    assignments: [emptyAssignment()] as AssignmentForm[],
  });
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const moduleOptions = getModules(segment);
  const studentsById = new Map(initial.students.map((item) => [item.id, item]));

  async function send(
    url: string,
    body: unknown,
    method: "POST" | "PATCH" | "DELETE" = "POST",
  ) {
    setSaving(url);
    setError("");
    setNotice("");

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        id?: string;
        name?: string;
        shift?: string;
        temporaryPassword?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar.");
        return null;
      }

      return data;
    } catch {
      setError("Não foi possível Conectar ao servidor.");
      return null;
    } finally {
      setSaving(null);
    }
  }

  function updateProfile<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const data = await send(`/api/schools/${schoolId}`, profileForm, "PATCH");
    if (!data) return;
    setNotice("Configuração da escola atualizada.");
    router.refresh();
  }

  async function addClassroom(event: FormEvent) {
    event.preventDefault();
    const data = await send(`/api/schools/${schoolId}/classrooms`, classroomForm);
    if (!data?.id) return;
    setClassroomForm((current) => ({ ...current, name: "" }));
    setNotice("Turma criada.");
    router.refresh();
  }

  async function generateClassrooms(event: FormEvent) {
    event.preventDefault();
    const data = await send(`/api/schools/${schoolId}/classrooms/generate`, generatorForm);
    if (!data) return;
    setNotice(`${(data as { created?: unknown[] }).created?.length ?? 0} turma(s) criada(s).`);
    router.refresh();
  }

  async function addPhysicalRoom(event: FormEvent) {
    event.preventDefault();
    const data = await send(`/api/schools/${schoolId}/physical-rooms`, physicalRoomForm);
    if (!data?.id) return;
    setPhysicalRoomForm({ name: "", squareMeters: "", capacity: "25" });
    setNotice("Sala física cadastrada.");
    router.refresh();
  }

  async function updateWaitlist(entryId: string, status: "atendido" | "cancelado") {
    const data = await send(
      `/api/schools/${schoolId}/classroom-waitlist/${entryId}`,
      { status },
      "PATCH",
    );
    if (!data) return;
    setWaitlist((current) =>
      current.map((item) => (item.id === entryId ? { ...item, status } : item)),
    );
    setNotice(
      status === "atendido"
        ? "Aluno enturmado a partir da lista de espera."
        : "Inscrição removida da lista de espera.",
    );
    router.refresh();
  }

  async function removeClassroom(classroomId: string, name: string) {
    if (!window.confirm(`Remover a turma ${name}?`)) return;
    const data = await send(
      `/api/schools/${schoolId}/classrooms/${classroomId}`,
      {},
      "DELETE",
    );
    if (!data) return;
    setNotice(`Turma ${name} removida.`);
    router.refresh();
  }

  async function removePhysicalRoom(roomId: string, name: string) {
    if (!window.confirm(`Remover a sala física ${name}?`)) return;
    const data = await send(
      `/api/schools/${schoolId}/physical-rooms/${roomId}`,
      {},
      "DELETE",
    );
    if (!data) return;
    setNotice(`Sala física ${name} removida.`);
    router.refresh();
  }

  function setAssignment(index: number, patch: Partial<AssignmentForm>) {
    setTeacherForm((current) => ({
      ...current,
      assignments: current.assignments.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function toAssignmentItem(
    assignment: AssignmentForm,
    teacher: TeacherItem,
    index: number,
  ): TeacherAssignmentItem {
    return {
      id: `${teacher.id}-${index}`,
      classroomId: assignment.classroomId,
      classroomName:
        classrooms.find((item) => item.id === assignment.classroomId)?.name ?? "",
      discipline: assignment.discipline,
      capacity: Number(assignment.capacity) || 25,
      students: assignment.studentIds.map((studentId) => ({
        id: studentId,
        name: studentsById.get(studentId)?.name ?? "Aluno",
      })),
    };
  }

  function resetTeacherForm() {
    setTeacherForm({
      name: "",
      email: "",
      assignments: [emptyAssignment()],
    });
    setEditingTeacherId(null);
  }

  function startTeacherEdit(teacher: TeacherItem) {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      email: teacher.email,
      assignments: teacher.assignments.length
        ? teacher.assignments.map((assignment) => ({
            classroomId: assignment.classroomId,
            discipline: assignment.discipline,
            studentIds: assignment.students.map((student) => student.id),
            capacity: String(assignment.capacity ?? 25),
          }))
        : [
            {
              classroomId: teacher.classroomId ?? "",
              discipline: teacher.discipline,
              studentIds: [],
              capacity: "25",
            },
          ],
    });
  }

  async function saveTeacher(event: FormEvent) {
    event.preventDefault();
    const selectedAssignments = teacherForm.assignments.filter(
      (assignment) => assignment.classroomId,
    );
    const assignments = selectedAssignments.map((assignment) => ({
      ...assignment,
      capacity: Number(assignment.capacity) || 25,
    }));

    if (assignments.length === 0) {
      setError("Informe ao menos uma turma para o professor.");
      return;
    }

    const editing = editingTeacherId !== null;
    const url = editing
      ? `/api/schools/${schoolId}/teachers/${editingTeacherId}`
      : `/api/schools/${schoolId}/teachers`;
    const body = editing
      ? { name: teacherForm.name, assignments }
      : { name: teacherForm.name, email: teacherForm.email, assignments };

    const data = await send(url, body, editing ? "PATCH" : "POST");
    if (!data) return;

    const baseTeacher: TeacherItem = editing
      ? (teachers.find((item) => item.id === editingTeacherId) as TeacherItem)
      : {
          id: data.id!,
          name: teacherForm.name,
          email: teacherForm.email.toLowerCase(),
          discipline: assignments[0].discipline,
          classroomId: assignments[0].classroomId,
          classroomName:
            classrooms.find((item) => item.id === assignments[0].classroomId)
              ?.name ?? null,
          assignments: [],
        };

    const updated: TeacherItem = {
      ...baseTeacher,
      name: teacherForm.name,
      discipline: assignments[0].discipline,
      classroomId: assignments[0].classroomId,
      assignments: selectedAssignments.map((assignment, index) =>
        toAssignmentItem(assignment, baseTeacher, index),
      ),
    };

    setTeachers((current) =>
      editing
        ? current.map((item) => (item.id === updated.id ? updated : item))
        : [...current, updated],
    );
    if (data.temporaryPassword) setTemporaryPassword(data.temporaryPassword);
    setNotice(
      editing
        ? "Vínculos do professor atualizados."
        : "Professor cadastrado e vínculos definidos.",
    );
    resetTeacherForm();
    router.refresh();
  }

  async function removeTeacher(teacher: TeacherItem) {
    if (
      !window.confirm(
        `Remover ${teacher.name} da escola? O usuário e todos os vínculos serão excluídos.`,
      )
    ) {
      return;
    }

    const data = await send(
      `/api/schools/${schoolId}/teachers/${teacher.id}`,
      {},
      "DELETE",
    );
    if (!data) return;

    setTeachers((current) => current.filter((item) => item.id !== teacher.id));
    if (editingTeacherId === teacher.id) resetTeacherForm();
    setNotice("Professor removido.");
    router.refresh();
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {error}
        <button
          type="button"
          onClick={() => setError("")}
          className="ml-3 font-semibold underline"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {capabilities.manageSchool && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Equipe e infraestrutura
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Estes dados são preenchidos pelo administrador da escola.
          </p>

          <form onSubmit={saveProfile} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Diretora Geral"
                value={profileForm.directorName}
                onChange={(value) => updateProfile("directorName", value)}
                placeholder="Maria da Silva"
              />
              <Input
                label="Coordenador Pedagógico"
                value={profileForm.pedagogicalCoordinator}
                onChange={(value) =>
                  updateProfile("pedagogicalCoordinator", value)
                }
                placeholder="Ana Souza"
              />
              <Input
                label="Secretaria Escolar"
                value={profileForm.secretaryName}
                onChange={(value) => updateProfile("secretaryName", value)}
                placeholder="Carla Lima"
              />
              <Input
                label="E-mail da direção"
                value={profileForm.directorEmail}
                onChange={(value) => updateProfile("directorEmail", value)}
                placeholder="direcao@escola.com.br"
                type="email"
              />
              <Input
                label="Telefone da direção"
                value={profileForm.directorPhone}
                onChange={(value) => updateProfile("directorPhone", value)}
                placeholder="(11) 90000-0000"
              />
              <Input
                label="Salas de aula"
                value={profileForm.classrooms}
                onChange={(value) => updateProfile("classrooms", value)}
                placeholder="12"
                type="number"
              />
            </div>

            <CheckGroup
              legend="Turnos de Funcionamento"
              options={SHIFT_OPTIONS}
              value={profileForm.shifts}
              onChange={(value) => updateProfile("shifts", value)}
            />
            <CheckGroup
              legend="Dependências"
              options={FACILITY_OPTIONS}
              value={profileForm.facilities}
              onChange={(value) => updateProfile("facilities", value)}
            />

            <button
              type="submit"
              disabled={Boolean(saving)}
              className={buttonClass}
            >
              {saving === `/api/schools/${schoolId}` ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar alterações
            </button>
          </form>
        </section>
      )}

      {capabilities.manageModules && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Regras pedagógicas e módulos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Defina a meta de cada bimestre e quais módulos ficam disponíveis
            nesta escola.
          </p>

          <form onSubmit={saveProfile} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Média de aprovação"
                type="number"
                value={profileForm.passingGrade}
                onChange={(value) => updateProfile("passingGrade", value)}
                placeholder="6,0"
              />
              <Input
                label="Bimestres no ano"
                type="number"
                value={profileForm.bimesters}
                onChange={(value) => updateProfile("bimesters", value)}
                placeholder="4"
              />
              <Input
                label="Frequência mínima (%)"
                type="number"
                value={profileForm.minFrequency}
                onChange={(value) => updateProfile("minFrequency", value)}
                placeholder="75"
              />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Modelo de rotatividade
              </span>
              <select
                value={profileForm.rotationModel}
                onChange={(event) =>
                  updateProfile(
                    "rotationModel",
                    event.target.value as ProfileForm["rotationModel"],
                  )
                }
                className={inputClass}
              >
                <option value="alunos">Alunos trocam de sala</option>
                <option value="professor">Professor troca de sala</option>
              </select>
              <span className="mt-2 block text-xs text-slate-500">
                {profileForm.rotationModel === "alunos"
                  ? "Os alunos permanecem na turma e os professores se deslocam entre salas/disciplinas."
                  : "Os professores permanecem na sala e os alunos se deslocam conforme a disciplina."}
              </span>
            </label>

            <CheckGroup
              legend="Módulos ativos"
              options={moduleOptions}
              value={profileForm.enabledModules}
              onChange={(value) => updateProfile("enabledModules", value)}
            />

            <button
              type="submit"
              disabled={Boolean(saving)}
              className={buttonClass}
            >
              {saving === `/api/schools/${schoolId}` ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar regras e módulos
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Meta atual: {rules.passingGrade.toFixed(1)} ·{" "}
            {rules.bimesters} bimestres · {rules.minFrequency}% de frequência.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Turmas e espaços físicos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Turma é o agrupamento pedagógico. Sala física é o espaço real e pode receber turmas em turnos diferentes.
        </p>

        {capabilities.createClassrooms && (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <form onSubmit={addClassroom} className="space-y-4 rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">Criar turma</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Série/ano" value={classroomForm.grade} onChange={(v) => setClassroomForm((c) => ({ ...c, grade: v }))} placeholder="1º ano" />
                <Input label="Nome da turma" value={classroomForm.name} onChange={(v) => setClassroomForm((c) => ({ ...c, name: v }))} placeholder="1º Ano A" />
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Turno</span>
                  <select className={inputClass} value={classroomForm.shift} onChange={(e) => setClassroomForm((c) => ({ ...c, shift: e.target.value }))}>
                    {SHIFT_OPTIONS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}
                  </select>
                </label>
                <Input label="Ano letivo" type="number" value={classroomForm.schoolYear} onChange={(v) => setClassroomForm((c) => ({ ...c, schoolYear: v }))} />
                <Input label="Vagas ofertadas" type="number" value={classroomForm.capacity} onChange={(v) => setClassroomForm((c) => ({ ...c, capacity: v }))} />
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Sala física (opcional)</span>
                  <select className={inputClass} value={classroomForm.physicalRoomId} onChange={(e) => setClassroomForm((c) => ({ ...c, physicalRoomId: e.target.value }))}>
                    <option value="">Sem sala física vinculada</option>
                    {physicalRooms.map((room) => <option key={room.id} value={room.id}>{room.name} ({room.capacity} cadeiras)</option>)}
                  </select>
                </label>
              </div>
              <button type="submit" disabled={Boolean(saving)} className={buttonClass}><Plus className="size-4" />Criar turma</button>
            </form>

            <form onSubmit={generateClassrooms} className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <p className="text-sm font-semibold text-slate-800">Gerador de turmas-base</p>
              <p className="text-xs text-slate-600">Planejamento prévio: gera turmas por série/turno. Ex.: 24 turmas para 1º ano Matutino.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Série/ano" value={generatorForm.grade} onChange={(v) => setGeneratorForm((c) => ({ ...c, grade: v }))} placeholder="1º ano" />
                <Input label="Quantidade" type="number" value={generatorForm.quantity} onChange={(v) => setGeneratorForm((c) => ({ ...c, quantity: v }))} />
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Turno</span>
                  <select className={inputClass} value={generatorForm.shift} onChange={(e) => setGeneratorForm((c) => ({ ...c, shift: e.target.value }))}>
                    {SHIFT_OPTIONS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}
                  </select>
                </label>
                <Input label="Ano letivo" type="number" value={generatorForm.schoolYear} onChange={(v) => setGeneratorForm((c) => ({ ...c, schoolYear: v }))} />
                <Input label="Vagas por turma" type="number" value={generatorForm.capacity} onChange={(v) => setGeneratorForm((c) => ({ ...c, capacity: v }))} />
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Sala física (opcional)</span>
                  <select className={inputClass} value={generatorForm.physicalRoomId} onChange={(e) => setGeneratorForm((c) => ({ ...c, physicalRoomId: e.target.value }))}>
                    <option value="">Vincular depois</option>
                    {physicalRooms.map((room) => <option key={room.id} value={room.id}>{room.name} ({room.capacity} cadeiras)</option>)}
                  </select>
                </label>
              </div>
              <button type="submit" disabled={Boolean(saving)} className={buttonClass}>Gerar turmas-base</button>
            </form>
          </div>
        )}

        {capabilities.managePhysicalRooms && (
          <form onSubmit={addPhysicalRoom} className="mt-6 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <Input label="Sala física" value={physicalRoomForm.name} onChange={(v) => setPhysicalRoomForm((c) => ({ ...c, name: v }))} placeholder="Sala 01 - Bloco A" />
            <Input label="Metragem (m²)" type="number" value={physicalRoomForm.squareMeters} onChange={(v) => setPhysicalRoomForm((c) => ({ ...c, squareMeters: v }))} placeholder="Opcional" />
            <Input label="Capacidade de cadeiras" type="number" value={physicalRoomForm.capacity} onChange={(v) => setPhysicalRoomForm((c) => ({ ...c, capacity: v }))} />
            <button type="submit" disabled={Boolean(saving)} className={buttonClass}><Plus className="size-4" />Adicionar sala física</button>
          </form>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Turmas</p>
            <div className="mt-3 space-y-3">
              {classrooms.length === 0 ? <p className="text-sm text-slate-500">Nenhuma turma cadastrada.</p> : classrooms.map((classroom) => (
                <div key={classroom.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{classroom.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {classroom.grade || "Série não informada"} · {classroom.shift || "Sem turno"} · {classroom.schoolYear}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {classroom.occupied}/{classroom.capacity} alunos · {classroom.seatsLeft} vagas
                        {classroom.physicalRoomName ? ` · ${classroom.physicalRoomName}` : " · sem sala física"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${classroom.status === "aberta" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {classroom.status}
                      </span>
                      {capabilities.manageSchool && (
                        <button
                          type="button"
                          onClick={() => removeClassroom(classroom.id, classroom.name)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                          aria-label={`Remover turma ${classroom.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Salas físicas</p>
            <div className="mt-3 space-y-3">
              {physicalRooms.length === 0 ? <p className="text-sm text-slate-500">Nenhuma sala física cadastrada.</p> : physicalRooms.map((room) => (
                <div key={room.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{room.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {room.capacity} cadeiras{room.squareMeters ? ` · ${room.squareMeters} m²` : ""} · {room.classroomCount} turma(s) vinculada(s)
                      </p>
                    </div>
                    {capabilities.manageSchool && (
                      <button
                        type="button"
                        onClick={() => removePhysicalRoom(room.id, room.name)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                        aria-label={`Remover sala física ${room.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm font-semibold text-slate-800">Lista de espera e alertas</p>
          <p className="mt-1 text-xs text-slate-600">Quando uma turma atinge a capacidade, o aluno fica cadastrado e entra na lista de espera.</p>
          <div className="mt-3 space-y-2">
            {waitlist.filter((item) => item.status === "aguardando").length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum aluno aguardando vaga.</p>
            ) : waitlist.filter((item) => item.status === "aguardando").map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2">
                <div className="text-sm text-slate-700">
                  <span className="font-semibold">{item.studentName}</span>
                  <span className="text-slate-500"> · {item.grade || "Série"} · {item.shift || "Turno"} · {item.classroomName || "Turma cheia"}{item.discipline ? ` · ${item.discipline}` : ""}</span>
                </div>
                {capabilities.manageWaitlist && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateWaitlist(item.id, "atendido")} className={secondaryButtonClass}>Marcar atendido</button>
                    <button type="button" onClick={() => updateWaitlist(item.id, "cancelado")} className={secondaryButtonClass}>Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Professores</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cada professor pode atender várias salas/disciplinas e ter alunos
          diferentes em cada vínculo.
        </p>

        {temporaryPassword && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Senha provisória do professor
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="break-all font-mono text-sm text-slate-900">
                {temporaryPassword}
              </code>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(temporaryPassword).catch(() => {})
                }
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                <Clipboard className="size-4" />
                Copiar
              </button>
            </div>
          </div>
        )}

        {capabilities.createTeachers && (
          <form onSubmit={saveTeacher} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nome do professor"
                value={teacherForm.name}
                onChange={(value) =>
                  setTeacherForm((current) => ({ ...current, name: value }))
                }
                placeholder="Ana Souza"
              />
              <Input
                label="E-mail"
                value={teacherForm.email}
                onChange={(value) =>
                  setTeacherForm((current) => ({ ...current, email: value }))
                }
                placeholder="professor@escola.com.br"
                type="email"
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">
                Turmas, disciplinas e alunos
              </legend>

              {teacherForm.assignments.map((assignment, index) => {
                const classroomStudents = initial.students.filter(
                  (student) =>
                    student.classroomId === assignment.classroomId &&
                    student.status === "ativo",
                );

                return (
                  <div
                    key={index}
                    className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_0.7fr_auto] sm:items-end">
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Turma</span>
                        <select
                          value={assignment.classroomId}
                          onChange={(event) => setAssignment(index, { classroomId: event.target.value, studentIds: [] })}
                          className={inputClass}
                        >
                          <option value="">Selecione a turma</option>
                          {classrooms.map((classroom) => (
                            <option key={classroom.id} value={classroom.id}>
                              {classroom.name} ({classroom.occupied}/{classroom.capacity})
                            </option>
                          ))}
                        </select>
                      </label>
                      <Input label="Disciplina" value={assignment.discipline} onChange={(value) => setAssignment(index, { discipline: value })} placeholder="Matemática" />
                      <Input label="Limite alunos" type="number" value={assignment.capacity} onChange={(value) => setAssignment(index, { capacity: value })} placeholder="25" />
                      {teacherForm.assignments.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setTeacherForm((current) => ({
                              ...current,
                              assignments: current.assignments.filter(
                                (_item, itemIndex) => itemIndex !== index,
                              ),
                            }))
                          }
                          className={`${secondaryButtonClass} mb-0.5`}
                        >
                          <Trash2 className="size-3.5" /> Remover
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-600">
                          Alunos deste vínculo ({assignment.studentIds.length})
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-emerald-700 underline"
                            onClick={() =>
                              setAssignment(index, {
                                studentIds: classroomStudents.map(
                                  (student) => student.id,
                                ),
                              })
                            }
                          >
                            Selecionar todos
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-slate-500 underline"
                            onClick={() => setAssignment(index, { studentIds: [] })}
                          >
                            Limpar
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 grid max-h-40 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
                        {classroomStudents.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            {assignment.classroomId
                              ? "Nenhum aluno ativo nesta turma."
                              : "Selecione uma turma para ver os alunos."}
                          </p>
                        ) : (
                          classroomStudents.map((student) => (
                            <label
                              key={student.id}
                              className="flex items-center gap-2 text-xs text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={assignment.studentIds.includes(student.id)}
                                onChange={(event) =>
                                  setAssignment(index, {
                                    studentIds: event.target.checked
                                      ? [
                                          ...assignment.studentIds,
                                          student.id,
                                        ]
                                      : assignment.studentIds.filter(
                                          (id) => id !== student.id,
                                        ),
                                  })
                                }
                                className="size-4 accent-emerald-600"
                              />
                              {student.name}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  setTeacherForm((current) => ({
                    ...current,
                    assignments: [...current.assignments, emptyAssignment()],
                  }))
                }
              >
                <Plus className="size-3.5" /> Adicionar vínculo (turma/disciplina)
              </button>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={Boolean(saving)} className={buttonClass}>
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editingTeacherId
                  ? "Salvar vínculos"
                  : "Cadastrar professor"}
              </button>
              {editingTeacherId && (
                <button
                  type="button"
                  onClick={resetTeacherForm}
                  className={secondaryButtonClass}
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        )}

        <div className="mt-5 space-y-3">
          {teachers.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum professor cadastrado.</p>
          ) : (
            teachers.map((teacher) => (
              <div key={teacher.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {teacher.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{teacher.email}</p>
                  </div>
                  {capabilities.updateTeachers && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        onClick={() => startTeacherEdit(teacher)}
                      >
                        <Pencil className="size-3.5" /> Editar vínculos
                      </button>
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        onClick={() => removeTeacher(teacher)}
                      >
                        <Trash2 className="size-3.5" /> Remover
                      </button>
                    </div>
                  )}
                </div>

                {teacher.assignments.length > 0 ? (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {teacher.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
                      >
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          {assignment.discipline || "Sem disciplina"}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {assignment.classroomName || "Sala não vinculada"}
                        </span>
                        <span>
                          {assignment.students.length}{" "}
                          {assignment.students.length === 1 ? "aluno" : "alunos"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Turma:</span>{" "}
                    {teacher.classroomName || "Não vinculada"}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <StudentsPanel
        schoolId={schoolId}
        classrooms={classrooms}
        students={initial.students}
        capabilities={capabilities}
      />

      {capabilities.manageMembers && (
        <MembersPanel schoolId={schoolId} members={initial.members} />
      )}

      {capabilities.reviewRequests && (
        <UpdateRequestsPanel schoolId={schoolId} requests={initial.requests} />
      )}

      {capabilities.manageSchool && <AuditPanel schoolId={schoolId} />}
    </div>
  );
}
