"use client";

import { LoaderCircle, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { AssessmentItem, StudentItem } from "./school-types";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const primaryButton =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60";

type Props = {
  schoolId: string;
  teacherName: string;
  discipline: string;
  classroomName: string;
  students: StudentItem[];
  assessments: AssessmentItem[];
};

export function MyClassroomPanel({
  schoolId,
  teacherName,
  discipline,
  classroomName,
  students,
  assessments,
}: Props) {
  const router = useRouter();
  const [override, setOverride] = useState<{
    source: AssessmentItem[];
    items: AssessmentItem[];
  } | null>(null);
  const items = override?.source === assessments ? override.items : assessments;
  function commit(next: AssessmentItem[]) {
    setOverride({ source: assessments, items: next });
  }
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [form, setForm] = useState({
    discipline: discipline || "Matemática",
    assessment: "",
    grade: "",
    presence: "presente",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

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

      commit([
        ...items,
        {
          id: data.id!,
          studentId,
          discipline: form.discipline,
          assessment: form.assessment,
          grade: Number(form.grade),
          presence: form.presence as "presente" | "falta",
          createdAt: new Date().toISOString(),
        },
      ]);
      setForm((current) => ({ ...current, assessment: "", grade: "" }));
      setOpenFor(null);
      setNotice("Avaliação lançada.");
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
          <h2 className="text-base font-semibold text-slate-900">Minha turma</h2>
          <p className="mt-1 text-sm text-slate-500">
            {teacherName} · {discipline || "Sem disciplina"} · {classroomName || "Sem sala vinculada"}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Users className="size-3.5" /> {students.length} alunos
        </span>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

      <div className="mt-5 space-y-3">
        {students.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum aluno na sua turma.</p>
        ) : (
          students.map((student) => {
            const studentAssessments = items.filter((item) => item.studentId === student.id);
            return (
              <div key={student.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">
                      {student.enrollmentNumber ?? "Sem número"} · {student.grade ?? "Sem série"}
                    </p>
                  </div>
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
                </div>

                {studentAssessments.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Avaliação</th>
                          <th className="px-3 py-2 font-semibold">Disciplina</th>
                          <th className="px-3 py-2 font-semibold">Nota</th>
                          <th className="px-3 py-2 font-semibold">Frequência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {studentAssessments.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">{item.assessment}</td>
                            <td className="px-3 py-2">{item.discipline}</td>
                            <td className="px-3 py-2 font-semibold">{item.grade.toFixed(1)}</td>
                            <td className="px-3 py-2">
                              {item.presence === "presente" ? "Presente" : "Falta"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {openFor === student.id && (
                  <form
                    onSubmit={(event) => saveAssessment(event, student.id)}
                    className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"
                  >
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Disciplina</span>
                      <input
                        value={form.discipline}
                        onChange={(event) => setForm((c) => ({ ...c, discipline: event.target.value }))}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Avaliação</span>
                      <input
                        value={form.assessment}
                        onChange={(event) => setForm((c) => ({ ...c, assessment: event.target.value }))}
                        className={inputClass}
                        placeholder="Prova bimestral"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Nota (0 a 10)</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={form.grade}
                        onChange={(event) => setForm((c) => ({ ...c, grade: event.target.value }))}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Frequência</span>
                      <select
                        value={form.presence}
                        onChange={(event) => setForm((c) => ({ ...c, presence: event.target.value }))}
                        className={inputClass}
                      >
                        <option value="presente">Presente</option>
                        <option value="falta">Falta</option>
                      </select>
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="submit" disabled={saving} className={primaryButton}>
                        {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600"
                        onClick={() => setOpenFor(null)}
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
    </section>
  );
}
