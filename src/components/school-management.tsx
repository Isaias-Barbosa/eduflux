"use client";

import { Clipboard, LoaderCircle, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  FACILITY_OPTIONS,
  SHIFT_OPTIONS,
  type FacilityOption,
  type ShiftOption,
} from "@/lib/schools/options";

type ClassroomItem = {
  id: string;
  name: string;
  shift: string | null;
};

type TeacherItem = {
  id: string;
  name: string;
  email: string;
  discipline: string;
  classroomId: string | null;
  classroomName: string | null;
};

type StudentItem = {
  id: string;
  name: string;
  status: "ativo" | "inativo";
  classroomId: string | null;
  classroomName: string | null;
};

type ProfileForm = {
  directorName: string;
  directorEmail: string;
  directorPhone: string;
  pedagogicalCoordinator: string;
  secretaryName: string;
  shifts: ShiftOption[];
  classrooms: string;
  facilities: FacilityOption[];
};

type Props = {
  schoolId: string;
  profile: ProfileForm;
  initial: {
    classrooms: ClassroomItem[];
    teachers: TeacherItem[];
    students: StudentItem[];
  };
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60";

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
  options: readonly T[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
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
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <label
              key={option}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                selected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(option)}
                className="size-4 accent-emerald-600"
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SchoolManagement({ schoolId, profile, initial }: Props) {
  const router = useRouter();
  const [profileForm, setProfileForm] = useState<ProfileForm>(profile);
  const [classrooms, setClassrooms] = useState(initial.classrooms);
  const [teachers, setTeachers] = useState(initial.teachers);
  const [students, setStudents] = useState(initial.students);
  const [classroomForm, setClassroomForm] = useState({ name: "", shift: "" });
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    discipline: "",
    classroomId: "",
  });
  const [studentForm, setStudentForm] = useState({
    name: "",
    classroomId: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [teacherPassword, setTeacherPassword] = useState("");

  async function send(
    url: string,
    body: unknown,
    method: "POST" | "PATCH" = "POST",
  ) {
    setSaving(url);
    setError("");
    setNotice("");

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        ok?: boolean;
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
    setNotice("Equipe e infraestrutura atualizadas.");
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

  async function addTeacher(event: FormEvent) {
    event.preventDefault();
    const data = await send(`/api/schools/${schoolId}/teachers`, teacherForm);
    if (!data?.id) return;

    const classroom = classrooms.find(
      (item) => item.id === teacherForm.classroomId,
    );
    setTeachers((current) => [
      ...current,
      {
        id: data.id!,
        name: teacherForm.name,
        email: teacherForm.email.toLowerCase(),
        discipline: teacherForm.discipline,
        classroomId: teacherForm.classroomId || null,
        classroomName: classroom?.name ?? null,
      },
    ]);
    if (data.temporaryPassword) setTeacherPassword(data.temporaryPassword);
    setTeacherForm({ name: "", email: "", discipline: "", classroomId: "" });
    router.refresh();
  }

  async function addStudent(event: FormEvent) {
    event.preventDefault();
    const data = await send(`/api/schools/${schoolId}/students`, studentForm);
    if (!data?.id) return;

    const classroom = classrooms.find(
      (item) => item.id === studentForm.classroomId,
    );
    setStudents((current) => [
      ...current,
      {
        id: data.id!,
        name: studentForm.name,
        status: "ativo",
        classroomId: studentForm.classroomId || null,
        classroomName: classroom?.name ?? null,
      },
    ]);
    setStudentForm({ name: "", classroomId: "" });
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Salas de aula</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cadastre as turmas para vincular professores e alunos.
        </p>

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
          <button
            type="submit"
            disabled={Boolean(saving)}
            className={`${buttonClass} sm:mb-0`}
          >
            <Plus className="size-4" />
            Adicionar
          </button>
        </form>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {classrooms.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma sala cadastrada.</p>
          ) : (
            classrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm font-semibold text-slate-800">
                  {classroom.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {classroom.shift || "Sem turno"} ·{" "}
                  {
                    students.filter(
                      (student) => student.classroomId === classroom.id,
                    ).length
                  }{" "}
                  alunos
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Professores</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cada professor recebe uma sala, uma disciplina e os alunos dessa sala.
        </p>

        {teacherPassword && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Senha provisória do professor
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="break-all font-mono text-sm text-slate-900">
                {teacherPassword}
              </code>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(teacherPassword).catch(() => {})
                }
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                <Clipboard className="size-4" />
                Copiar
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={addTeacher}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
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
          <Input
            label="Disciplina"
            value={teacherForm.discipline}
            onChange={(value) =>
              setTeacherForm((current) => ({ ...current, discipline: value }))
            }
            placeholder="Matemática"
          />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Sala de aula
            </span>
            <select
              value={teacherForm.classroomId}
              onChange={(event) =>
                setTeacherForm((current) => ({
                  ...current,
                  classroomId: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="">Sem sala</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={Boolean(saving)}
            className={`${buttonClass} sm:col-span-2`}
          >
            <Plus className="size-4" />
            Cadastrar professor
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {teachers.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum professor cadastrado.
            </p>
          ) : (
            teachers.map((teacher) => {
              const classStudents = students.filter(
                (student) => student.classroomId === teacher.classroomId,
              );
              return (
                <div
                  key={teacher.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {teacher.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {teacher.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {teacher.discipline || "Sem disciplina"}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <p>
                      <span className="font-semibold text-slate-700">Sala:</span>{" "}
                      {teacher.classroomName || "Não vinculada"}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-slate-700">
                        Alunos da sala ({classStudents.length}):
                      </span>{" "}
                      {classStudents.length
                        ? classStudents.map((student) => student.name).join(", ")
                        : "nenhum"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Alunos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Matricule alunos nas salas cadastradas.
        </p>

        <form onSubmit={addStudent} className="mt-5 grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <Input
            label="Nome do aluno"
            value={studentForm.name}
            onChange={(value) =>
              setStudentForm((current) => ({ ...current, name: value }))
            }
            placeholder="João da Silva"
          />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Sala de aula
            </span>
            <select
              value={studentForm.classroomId}
              onChange={(event) =>
                setStudentForm((current) => ({
                  ...current,
                  classroomId: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="">Sem sala</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={Boolean(saving)}
            className={buttonClass}
          >
            <Plus className="size-4" />
            Matricular
          </button>
        </form>

        <div className="mt-5 space-y-2">
          {students.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum aluno matriculado.</p>
          ) : (
            students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {student.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {student.classroomName || "Sem sala"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {student.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
