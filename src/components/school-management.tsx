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

import {
  FACILITY_OPTIONS,
  SHIFT_OPTIONS,
} from "@/lib/schools/options";
import { getModules, type SchoolSegment } from "@/lib/schools/segments";
import { MembersPanel } from "./members-panel";
import { StudentsPanel } from "./students-panel";
import { UpdateRequestsPanel } from "./update-requests-panel";
import type {
  AssessmentItem,
  ClassroomItem,
  MemberItem,
  ProfileForm,
  SchoolCapabilities,
  SchoolRules,
  StudentItem,
  TeacherAssignmentItem,
  TeacherItem,
  UpdateRequestItem,
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
};

const emptyAssignment = (): AssignmentForm => ({
  classroomId: "",
  discipline: "",
  studentIds: [],
});

type Props = {
  schoolId: string;
  segment: SchoolSegment;
  rules: SchoolRules;
  profile: ProfileForm;
  capabilities: SchoolCapabilities;
  initial: {
    classrooms: ClassroomItem[];
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
  const [classrooms, setClassrooms] = useState(initial.classrooms);
  const [teachers, setTeachers] = useState(initial.teachers);
  const [classroomForm, setClassroomForm] = useState({ name: "", shift: "" });
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

    setClassrooms((current) => [
      ...current,
      { id: data.id!, name: data.name!, shift: data.shift ?? null },
    ]);
    setClassroomForm({ name: "", shift: "" });
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
          }))
        : [
            {
              classroomId: teacher.classroomId ?? "",
              discipline: teacher.discipline,
              studentIds: [],
            },
          ],
    });
  }

  async function saveTeacher(event: FormEvent) {
    event.preventDefault();
    const assignments = teacherForm.assignments.filter(
      (assignment) => assignment.classroomId,
    );

    if (assignments.length === 0) {
      setError("Informe ao menos uma sala para o professor.");
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
      assignments: assignments.map((assignment, index) =>
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
        <h2 className="text-base font-semibold text-slate-900">Salas de aula</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cadastre as turmas para vincular professores e alunos.
        </p>

        {capabilities.createClassrooms && (
          <form
            onSubmit={addClassroom}
            className="mt-5 grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
          >
            <Input
              label="Nome da sala"
              value={classroomForm.name}
              onChange={(value) =>
                setClassroomForm((current) => ({ ...current, name: value }))
              }
              placeholder="5º Ano A"
            />
            <Input
              label="Turno"
              value={classroomForm.shift}
              onChange={(value) =>
                setClassroomForm((current) => ({ ...current, shift: value }))
              }
              placeholder="Manhã"
            />
            <button type="submit" disabled={Boolean(saving)} className={`${buttonClass} sm:mb-0`}>
              <Plus className="size-4" />
              Adicionar
            </button>
          </form>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {classrooms.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma sala cadastrada.</p>
          ) : (
            classrooms.map((classroom) => (
              <div key={classroom.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800">{classroom.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {classroom.shift || "Sem turno"}
                </p>
              </div>
            ))
          )}
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
                Salas, disciplinas e alunos
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
                    <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">
                          Sala
                        </span>
                        <select
                          value={assignment.classroomId}
                          onChange={(event) =>
                            setAssignment(index, {
                              classroomId: event.target.value,
                              studentIds: [],
                            })
                          }
                          className={inputClass}
                        >
                          <option value="">Selecione a sala</option>
                          {classrooms.map((classroom) => (
                            <option key={classroom.id} value={classroom.id}>
                              {classroom.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Input
                        label="Disciplina"
                        value={assignment.discipline}
                        onChange={(value) =>
                          setAssignment(index, { discipline: value })
                        }
                        placeholder="Matemática"
                      />
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
                              ? "Nenhum aluno ativo nesta sala."
                              : "Selecione uma sala para ver os alunos."}
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
                <Plus className="size-3.5" /> Adicionar vínculo
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
                    <span className="font-semibold text-slate-700">Sala:</span>{" "}
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
    </div>
  );
}
