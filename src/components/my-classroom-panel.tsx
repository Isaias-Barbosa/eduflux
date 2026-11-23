"use client";

import {
  BookOpenCheck,
  ClipboardList,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { TeacherAssignmentContext } from "@/lib/schools/student-scope";
import type {
  AssessmentItem,
  OccurrenceItem,
  SchoolCapabilities,
  SchoolRules,
  StudentItem,
} from "./school-types";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const primaryButton =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60";

const secondaryButton =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60";

const OCCURRENCE_TYPES = [
  ["pedagogica", "Pedagógica"],
  ["disciplinar", "Disciplinar"],
  ["frequencia", "Frequência"],
  ["saude", "Saúde"],
  ["outro", "Outro"],
] as const;

const OCCURRENCE_SEVERITIES = [
  ["baixa", "Baixa"],
  ["media", "Média"],
  ["alta", "Alta"],
] as const;

const ASSESSMENT_TYPES = [
  ["avaliacao", "Avaliação"],
  ["recuperacao", "Recuperação"],
  ["trabalho", "Trabalho"],
  ["prova", "Prova"],
] as const;

type Props = {
  schoolId: string;
  teacherName: string;
  assignments: TeacherAssignmentContext[];
  students: StudentItem[];
  assessments: AssessmentItem[];
  occurrences: OccurrenceItem[];
  rules: SchoolRules;
  capabilities: SchoolCapabilities;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function weightedAverage(items: AssessmentItem[]): number | null {
  const graded = items.filter((item) => item.assessmentType !== "recuperacao");
  const totalWeight = graded.reduce((total, item) => total + item.weight, 0);
  if (totalWeight === 0) return null;
  return (
    graded.reduce((total, item) => total + item.grade * item.weight, 0) /
    totalWeight
  );
}

function frequencyRate(items: AssessmentItem[]): number | null {
  if (items.length === 0) return null;
  return (items.filter((item) => item.presence === "presente").length / items.length) * 100;
}

export function MyClassroomPanel({
  schoolId,
  teacherName,
  assignments,
  students,
  assessments,
  occurrences,
  rules,
  capabilities,
}: Props) {
  const router = useRouter();
  const [bimester, setBimester] = useState(1);

  const [assessmentOverride, setAssessmentOverride] = useState<{
    source: AssessmentItem[];
    items: AssessmentItem[];
  } | null>(null);
  const items =
    assessmentOverride?.source === assessments ? assessmentOverride.items : assessments;
  function commitAssessments(next: AssessmentItem[]) {
    setAssessmentOverride({ source: assessments, items: next });
  }

  const [occurrenceOverride, setOccurrenceOverride] = useState<{
    source: OccurrenceItem[];
    items: OccurrenceItem[];
  } | null>(null);
  const occurrenceItems =
    occurrenceOverride?.source === occurrences ? occurrenceOverride.items : occurrences;
  function commitOccurrences(next: OccurrenceItem[]) {
    setOccurrenceOverride({ source: occurrences, items: next });
  }

  const [openFor, setOpenFor] = useState<string | null>(null);
  const [form, setForm] = useState({
    discipline: assignments[0]?.discipline || "Matemática",
    assessment: "",
    bimester: "1",
    weight: "1",
    assessmentType: "avaliacao",
    grade: "",
    presence: "presente",
  });

  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    assessment: "",
    discipline: "",
    grade: "",
    bimester: "1",
    weight: "1",
    assessmentType: "avaliacao",
    presence: "presente",
  });

  const [occurrenceFor, setOccurrenceFor] = useState<string | null>(null);
  const [occurrenceForm, setOccurrenceForm] = useState({
    occurrenceDate: today(),
    type: "pedagogica",
    severity: "baixa",
    description: "",
  });

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const configuredBimesters = Array.from(
    { length: rules.bimesters },
    (_, index) => index + 1,
  );
  // Avaliações antigas podem referenciar bimestres além do configurado; mantê-los
  // na lista permite visualizar e corrigir esses registros legados.
  const bimesterOptions = Array.from(
    new Set([...configuredBimesters, ...items.map((item) => item.bimester)]),
  ).sort((a, b) => a - b);

  async function saveAssessment(event: FormEvent, studentId: string) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/students/${studentId}/assessments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível lançar a avaliação.");
        return;
      }

      commitAssessments([
        ...items,
        {
          id: data.id!,
          studentId,
          discipline: form.discipline,
          assessment: form.assessment,
          grade: Number(form.grade),
          bimester: Number(form.bimester),
          weight: Number(form.weight),
          assessmentType: form.assessmentType as AssessmentItem["assessmentType"],
          presence: form.presence as "presente" | "falta",
          createdAt: new Date().toISOString(),
        },
      ]);
      setForm((current) => ({ ...current, assessment: "", grade: "" }));
      setOpenFor(null);
      setNotice(`Avaliação lançada no ${form.bimester}º bimestre.`);
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: AssessmentItem) {
    setEditingAssessmentId(item.id);
    setEditForm({
      assessment: item.assessment,
      discipline: item.discipline,
      grade: item.grade.toString(),
      bimester: item.bimester.toString(),
      weight: item.weight.toString(),
      assessmentType: item.assessmentType,
      presence: item.presence,
    });
    setError("");
    setNotice("");
  }

  async function saveEdit(event: FormEvent, item: AssessmentItem) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/students/${item.studentId}/assessments/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível atualizar a avaliação.");
        return;
      }

      commitAssessments(
        items.map((current) =>
          current.id === item.id
            ? {
                ...current,
                assessment: editForm.assessment,
                discipline: editForm.discipline,
                grade: Number(editForm.grade),
                bimester: Number(editForm.bimester),
                weight: Number(editForm.weight),
                assessmentType: editForm.assessmentType as AssessmentItem["assessmentType"],
                presence: editForm.presence as "presente" | "falta",
              }
            : current,
        ),
      );
      setEditingAssessmentId(null);
      setNotice("Avaliação corrigida.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAssessment(item: AssessmentItem) {
    if (!window.confirm("Excluir esta avaliação?")) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/students/${item.studentId}/assessments/${item.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Não foi possível excluir a avaliação.");
        return;
      }
      commitAssessments(items.filter((current) => current.id !== item.id));
      if (editingAssessmentId === item.id) setEditingAssessmentId(null);
      setNotice("Avaliação excluída.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function saveOccurrence(event: FormEvent, studentId: string) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/students/${studentId}/occurrences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(occurrenceForm),
        },
      );
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível registrar a ocorrência.");
        return;
      }

      commitOccurrences([
        {
          id: data.id!,
          studentId,
          occurrenceDate: occurrenceForm.occurrenceDate,
          type: occurrenceForm.type as OccurrenceItem["type"],
          severity: occurrenceForm.severity as OccurrenceItem["severity"],
          description: occurrenceForm.description,
          createdAt: new Date().toISOString(),
        },
        ...occurrenceItems,
      ]);
      setOccurrenceForm({ ...occurrenceForm, description: "" });
      setOccurrenceFor(null);
      setNotice("Ocorrência registrada.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Meu diário de classe
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {teacherName} · {assignments.length}{" "}
            {assignments.length === 1 ? "vínculo" : "vínculos"}
          </p>
          {assignments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {assignments.map((assignment) => (
                <span
                  key={assignment.id}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                >
                  {assignment.discipline || "Sem disciplina"} ·{" "}
                  {assignment.classroomName}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Modelo da escola:{" "}
            {rules.rotationModel === "alunos"
              ? "alunos trocam de sala"
              : "professor troca de sala"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Bimestre
          <select
            value={bimester}
            onChange={(event) => setBimester(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500"
          >
            {bimesterOptions.map((option) => (
              <option key={option} value={option}>
                {option}º bimestre
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {students.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum aluno vinculado aos seus vínculos. Peça à secretaria para
            associar os alunos às suas salas/disciplinas.
          </p>
        ) : (
          students.map((student) => {
            const studentAssessments = items.filter(
              (item) => item.studentId === student.id,
            );
            const studentOccurrences = occurrenceItems.filter(
              (item) => item.studentId === student.id,
            );

            return (
              <div key={student.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {student.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {student.enrollmentNumber ?? "Sem número"} ·{" "}
                      {student.grade ?? "Sem série"} ·{" "}
                      {student.classroomName ?? "Sem turma"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.writeGrades && (
                      <button
                        type="button"
                        className={primaryButton}
                        onClick={() => {
                          setOpenFor(openFor === student.id ? null : student.id);
                          setError("");
                        }}
                      >
                        <Plus className="size-3.5" /> Nota / frequência
                      </button>
                    )}
                    {capabilities.writeOccurrences && (
                      <button
                        type="button"
                        className={secondaryButton}
                        onClick={() => {
                          setOccurrenceFor(
                            occurrenceFor === student.id ? null : student.id,
                          );
                          setError("");
                        }}
                      >
                        <ClipboardList className="size-3.5" /> Ocorrência
                      </button>
                    )}
                  </div>
                </div>

                {studentAssessments.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Bim.</th>
                          <th className="px-3 py-2 font-semibold">Avaliação</th>
                          <th className="px-3 py-2 font-semibold">Disciplina</th>
                          <th className="px-3 py-2 font-semibold">Tipo</th>
                          <th className="px-3 py-2 font-semibold">Nota</th>
                          <th className="px-3 py-2 font-semibold">Peso</th>
                          <th className="px-3 py-2 font-semibold">Freq.</th>
                          {capabilities.updateGrades && (
                            <th className="px-3 py-2 font-semibold">Ações</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {studentAssessments.map((item) => {
                          const label = ASSESSMENT_TYPES.find(
                            ([value]) => value === item.assessmentType,
                          )?.[1] ?? "Avaliação";
                          return (
                            <tr
                              key={item.id}
                              className={item.bimester === bimester ? "bg-emerald-50/40" : ""}
                            >
                              <td className="px-3 py-2">{item.bimester}º</td>
                              <td className="px-3 py-2">{item.assessment}</td>
                              <td className="px-3 py-2">{item.discipline}</td>
                              <td className="px-3 py-2">{label}</td>
                              <td className="px-3 py-2 font-semibold">
                                {item.grade.toFixed(1)}
                              </td>
                              <td className="px-3 py-2">{item.weight.toFixed(1)}</td>
                              <td className="px-3 py-2">
                                {item.presence === "presente" ? "Presente" : "Falta"}
                              </td>
                              {capabilities.updateGrades && (
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      aria-label="Editar avaliação"
                                      onClick={() => startEdit(item)}
                                      className="text-emerald-700"
                                    >
                                      <Pencil className="size-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Excluir avaliação"
                                      onClick={() => removeAssessment(item)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {editingAssessmentId &&
                  items.some((item) => item.id === editingAssessmentId) && (
                    <form
                      onSubmit={(event) =>
                        saveEdit(
                          event,
                          items.find((item) => item.id === editingAssessmentId)!,
                        )
                      }
                      className="mt-3 grid gap-3 rounded-lg bg-amber-50 p-3 sm:grid-cols-3"
                    >
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Avaliação</span>
                        <input
                          value={editForm.assessment}
                          onChange={(event) =>
                            setEditForm((c) => ({ ...c, assessment: event.target.value }))
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Disciplina</span>
                        <input
                          value={editForm.discipline}
                          onChange={(event) =>
                            setEditForm((c) => ({ ...c, discipline: event.target.value }))
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Nota</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={editForm.grade}
                          onChange={(event) =>
                            setEditForm((c) => ({ ...c, grade: event.target.value }))
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Bimestre</span>
                        <select
                          value={editForm.bimester}
                          onChange={(event) =>
                            setEditForm((c) => ({ ...c, bimester: event.target.value }))
                          }
                          className={inputClass}
                        >
                          {bimesterOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}º
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Peso</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          value={editForm.weight}
                          onChange={(event) =>
                            setEditForm((c) => ({ ...c, weight: event.target.value }))
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Frequência</span>
                        <select
                          value={editForm.presence}
                          onChange={(event) =>
                            setEditForm((c) => ({ ...c, presence: event.target.value }))
                          }
                          className={inputClass}
                        >
                          <option value="presente">Presente</option>
                          <option value="falta">Falta</option>
                        </select>
                      </label>
                      <div className="flex gap-2 sm:col-span-3">
                        <button type="submit" disabled={saving} className={primaryButton}>
                          {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                          Salvar correção
                        </button>
                        <button
                          type="button"
                          className={secondaryButton}
                          onClick={() => setEditingAssessmentId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                {openFor === student.id && capabilities.writeGrades && (
                  <form
                    onSubmit={(event) => saveAssessment(event, student.id)}
                    className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3"
                  >
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Disciplina</span>
                      <input
                        value={form.discipline}
                        onChange={(event) =>
                          setForm((c) => ({ ...c, discipline: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Avaliação</span>
                      <input
                        value={form.assessment}
                        onChange={(event) =>
                          setForm((c) => ({ ...c, assessment: event.target.value }))
                        }
                        className={inputClass}
                        placeholder="Prova bimestral"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Bimestre</span>
                      <select
                        value={form.bimester}
                        onChange={(event) =>
                          setForm((c) => ({ ...c, bimester: event.target.value }))
                        }
                        className={inputClass}
                      >
                        {configuredBimesters.map((option) => (
                          <option key={option} value={option}>
                            {option}º bimestre
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Tipo</span>
                      <select
                        value={form.assessmentType}
                        onChange={(event) =>
                          setForm((c) => ({ ...c, assessmentType: event.target.value }))
                        }
                        className={inputClass}
                      >
                        {ASSESSMENT_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Nota (0 a 10)</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={form.grade}
                        onChange={(event) =>
                          setForm((c) => ({ ...c, grade: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Peso</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={form.weight}
                        onChange={(event) =>
                          setForm((c) => ({ ...c, weight: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Frequência</span>
                      <select
                        value={form.presence}
                        onChange={(event) =>
                          setForm((c) => ({ ...c, presence: event.target.value }))
                        }
                        className={inputClass}
                      >
                        <option value="presente">Presente</option>
                        <option value="falta">Falta</option>
                      </select>
                    </label>
                    <div className="flex gap-2 sm:col-span-3">
                      <button type="submit" disabled={saving} className={primaryButton}>
                        {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                        Salvar
                      </button>
                      <button
                        type="button"
                        className={secondaryButton}
                        onClick={() => setOpenFor(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {capabilities.viewOccurrences &&
                  studentOccurrences.length > 0 && (
                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <p className="text-xs font-semibold text-slate-600">
                        Ocorrências
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {studentOccurrences.map((occurrence) => (
                          <li
                            key={occurrence.id}
                            className="text-xs leading-5 text-slate-700"
                          >
                            <span className="font-semibold">
                              {occurrence.occurrenceDate.split("-").reverse().join("/")} ·{" "}
                              {OCCURRENCE_TYPES.find(
                                ([value]) => value === occurrence.type,
                              )?.[1] ?? occurrence.type}
                              {" · "}
                              {OCCURRENCE_SEVERITIES.find(
                                ([value]) => value === occurrence.severity,
                              )?.[1] ?? occurrence.severity}
                            </span>{" "}
                            — {occurrence.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {occurrenceFor === student.id && capabilities.writeOccurrences && (
                  <form
                    onSubmit={(event) => saveOccurrence(event, student.id)}
                    className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3"
                  >
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Data</span>
                      <input
                        type="date"
                        value={occurrenceForm.occurrenceDate}
                        onChange={(event) =>
                          setOccurrenceForm((c) => ({
                            ...c,
                            occurrenceDate: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Tipo</span>
                      <select
                        value={occurrenceForm.type}
                        onChange={(event) =>
                          setOccurrenceForm((c) => ({ ...c, type: event.target.value }))
                        }
                        className={inputClass}
                      >
                        {OCCURRENCE_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Gravidade</span>
                      <select
                        value={occurrenceForm.severity}
                        onChange={(event) =>
                          setOccurrenceForm((c) => ({
                            ...c,
                            severity: event.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        {OCCURRENCE_SEVERITIES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-3">
                      <span className="text-xs font-semibold text-slate-600">
                        Descrição
                      </span>
                      <textarea
                        rows={2}
                        value={occurrenceForm.description}
                        onChange={(event) =>
                          setOccurrenceForm((c) => ({
                            ...c,
                            description: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="Descreva o fato observado"
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-3">
                      <button type="submit" disabled={saving} className={primaryButton}>
                        {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                        Registrar
                      </button>
                      <button
                        type="button"
                        className={secondaryButton}
                        onClick={() => setOccurrenceFor(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BookOpenCheck className="size-4 text-emerald-700" />
            Meta de aprovação · {bimester}º bimestre
          </div>
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            Média necessária: {rules.passingGrade.toFixed(1)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Frequência mínima: {rules.minFrequency}% · recuperações não entram na
          média · média ponderada pelo peso de cada avaliação.
        </p>

        <div className="mt-3 overflow-hidden rounded-lg border border-emerald-100 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Aluno</th>
                <th className="px-3 py-2 font-semibold">Avaliações no bimestre</th>
                <th className="px-3 py-2 font-semibold">Média</th>
                <th className="px-3 py-2 font-semibold">Meta</th>
                <th className="px-3 py-2 font-semibold">Situação</th>
                <th className="px-3 py-2 font-semibold">Frequência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-slate-500">
                    Nenhum aluno para acompanhar.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const average = weightedAverage(bimesterAssessmentsFor(items, student.id, bimester));
                  const frequency = frequencyRate(
                    bimesterAssessmentsFor(items, student.id, bimester),
                  );
                  const approved = average !== null && average >= rules.passingGrade;

                  return (
                    <tr key={student.id}>
                      <td className="px-3 py-2 font-medium">{student.name}</td>
                      <td className="px-3 py-2">
                        {bimesterAssessmentsFor(items, student.id, bimester).length}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {average === null ? "—" : average.toFixed(1)}
                      </td>
                      <td className="px-3 py-2">{rules.passingGrade.toFixed(1)}</td>
                      <td className="px-3 py-2">
                        {average === null ? (
                          <span className="text-slate-400">Sem notas</span>
                        ) : approved ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                            Aprovado
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                            Abaixo da meta
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {frequency === null
                          ? "—"
                          : `${frequency.toFixed(1)}% ${
                              frequency >= rules.minFrequency
                                ? "· OK"
                                : "· abaixo do mínimo"
                            }`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Users className="size-3.5" />
        {students.length} {students.length === 1 ? "aluno acompanhado" : "alunos acompanhados"}
      </p>
    </section>
  );
}

function bimesterAssessmentsFor(
  items: AssessmentItem[],
  studentId: string,
  bimester: number,
) {
  return items.filter(
    (item) => item.studentId === studentId && item.bimester === bimester,
  );
}
