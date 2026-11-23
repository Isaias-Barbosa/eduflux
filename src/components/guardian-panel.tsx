"use client";

import { BookOpen, LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type {
  AssessmentItem,
  StudentItem,
  UpdateRequestItem,
} from "./school-types";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60";

type FormState = {
  studentId: string;
  note: string;
  phone: string;
  emergencyPhone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const emptyForm: FormState = {
  studentId: "",
  note: "",
  phone: "",
  emergencyPhone: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

const FIELD_LABELS: Record<string, string> = {
  phone: "Telefone",
  emergencyPhone: "Telefone de emergência",
  zipCode: "CEP",
  street: "Logradouro",
  number: "Número",
  complement: "Complemento",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "UF",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export function GuardianPanel({
  schoolId,
  students,
  requests,
  assessments,
}: {
  schoolId: string;
  students: StudentItem[];
  requests: UpdateRequestItem[];
  assessments: AssessmentItem[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    studentId: students[0]?.id ?? "",
  });
  const [override, setOverride] = useState<{
    source: UpdateRequestItem[];
    items: UpdateRequestItem[];
  } | null>(null);
  const items = override?.source === requests ? override.items : requests;
  function commit(next: UpdateRequestItem[]) {
    setOverride({ source: requests, items: next });
  }
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload: Record<string, string> = {};
    for (const key of [
      "phone",
      "emergencyPhone",
      "zipCode",
      "street",
      "number",
      "complement",
      "neighborhood",
      "city",
      "state",
    ] as const) {
      if (form[key].trim()) payload[key] = form[key].trim();
    }

    if (!form.studentId) {
      setError("Selecione o aluno.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/students/${form.studentId}/update-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: form.note, payload }),
        },
      );
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível enviar a solicitação.");
        return;
      }

      commit([
        {
          id: data.id!,
          studentId: form.studentId,
          studentName:
            students.find((student) => student.id === form.studentId)?.name ?? "Aluno",
          status: "pendente",
          note: form.note,
          payload: JSON.stringify(payload),
          reviewNote: null,
          createdAt: new Date().toISOString(),
          requesterName: "Você",
        },
        ...items,
      ]);
      setForm((current) => ({ ...emptyForm, studentId: current.studentId }));
      setNotice("Solicitação enviada à secretaria.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Meus alunos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dados cadastrais e boletim dos alunos sob sua responsabilidade.
        </p>

        <div className="mt-5 space-y-3">
          {students.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum aluno vinculado ao seu usuário. Solicite à secretaria o vínculo.
            </p>
          ) : (
            students.map((student) => (
              <div key={student.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">
                      {student.enrollmentNumber ?? "Sem número"} · {student.grade ?? "Sem série"} ·{" "}
                      {student.classroomName ?? "Sem turma"}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {STATUS_LABELS[student.status] ?? student.status}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <BookOpen className="size-3.5" /> Boletim
                </p>
                {assessments.filter((item) => item.studentId === student.id).length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Nenhuma nota ou frequência lançada até o momento.
                  </p>
                ) : (
                  <div className="mt-2 overflow-hidden rounded-lg border border-slate-100">
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
                        {assessments
                          .filter((item) => item.studentId === student.id)
                          .map((item) => (
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
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Solicitar atualização cadastral
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Preencha apenas os campos que deseja alterar. A secretaria analisará o pedido.
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        {notice && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Aluno</span>
            <select
              value={form.studentId}
              onChange={(event) => set("studentId", event.target.value)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["phone", "Telefone"],
                ["emergencyPhone", "Telefone de emergência"],
                ["zipCode", "CEP"],
                ["street", "Logradouro"],
                ["number", "Número"],
                ["complement", "Complemento"],
                ["neighborhood", "Bairro"],
                ["city", "Cidade"],
                ["state", "UF"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-semibold text-slate-600">{label}</span>
                <input
                  value={form[key]}
                  onChange={(event) => set(key, event.target.value)}
                  className={inputClass}
                  placeholder="Deixe em branco para não alterar"
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Justificativa</span>
            <textarea
              value={form.note}
              onChange={(event) => set("note", event.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Descreva o que deseja alterar"
            />
          </label>

          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Enviar solicitação
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Minhas solicitações</h2>
        <div className="mt-4 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma solicitação enviada.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{item.studentName}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                {item.reviewNote && (
                  <p className="mt-1 text-xs text-slate-600">Parecer: {item.reviewNote}</p>
                )}
                {Object.keys(JSON.parse(item.payload || "{}") as object).length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Campos: {Object.keys(JSON.parse(item.payload) as Record<string, string>).map((key) => FIELD_LABELS[key] ?? key).join(", ")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
