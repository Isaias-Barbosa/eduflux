"use client";

import {
  CalendarDays,
  ClipboardCheck,
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SHIFT_OPTIONS } from "@/lib/schools/options";
import type {
  ClassroomItem,
  HistoryRecordItem,
  SchoolCapabilities,
  StudentItem,
} from "./school-types";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60";

const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60";

const SEX_OPTIONS = [
  ["feminino", "Feminino"],
  ["masculino", "Masculino"],
  ["outro", "Outro"],
  ["nao_informado", "Não informado"],
] as const;

const RACE_OPTIONS = [
  ["branca", "Branca"],
  ["preta", "Preta"],
  ["parda", "Parda"],
  ["amarela", "Amarela"],
  ["indigena", "Indígena"],
  ["nao_informado", "Não informado"],
] as const;

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  transferido: "Transferido",
  concluido: "Concluído",
  pendente: "Pendente",
  validado: "Validado",
};

type HistorySnapshot = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function todayDateInput(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatTransferDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatHistoryText(snapshot: HistorySnapshot): string {
  const school = asRecord(snapshot.school);
  const rules = asRecord(snapshot.rules);
  const student = asRecord(snapshot.student);
  const assessments = Array.isArray(snapshot.assessments)
    ? (snapshot.assessments as Array<Record<string, unknown>>)
    : [];
  const occurrences = Array.isArray(snapshot.occurrences)
    ? (snapshot.occurrences as Array<Record<string, unknown>>)
    : [];

  const lines = [
    "HISTÓRICO ESCOLAR",
    `Escola: ${textValue(school.name)}`,
    `Razão social: ${textValue(school.legalName)}`,
    `CNPJ: ${textValue(school.cnpj)}`,
    `INEP: ${textValue(school.inepCode)}`,
    `Localização: ${textValue(school.city)}/${textValue(school.state)}`,
    `Diretor(a): ${textValue(school.directorName)}`,
    `Secretaria: ${textValue(school.secretaryName)}`,
    "",
    `Aluno(a): ${textValue(student.name)}`,
    `Matrícula: ${textValue(student.enrollmentNumber)}`,
    `Nascimento: ${textValue(student.birthDate)}`,
    `Naturalidade: ${textValue(student.birthCity)}/${textValue(student.birthState)}`,
    `Filiação: ${textValue(student.motherName)} e ${textValue(student.fatherName)}`,
    `Série/turma: ${textValue(student.grade)} · ${textValue(student.classroomName)}`,
    `Turno: ${textValue(student.shift)}`,
    `Situação: ${textValue(student.status)}`,
    "",
    `Média de aprovação: ${textValue(rules.passingGrade)}`,
    `Bimestres: ${textValue(rules.bimesters)}`,
    `Frequência mínima: ${textValue(rules.minFrequency)}%`,
    "",
    "AVALIAÇÕES",
  ];

  const byBimester = new Map<string, Array<Record<string, unknown>>>();
  for (const item of assessments) {
    const key = textValue(item.bimester);
    const group = byBimester.get(key) ?? [];
    group.push(item);
    byBimester.set(key, group);
  }

  const bimesters = [...byBimester.keys()].sort((a, b) => {
    const first = Number(a);
    const second = Number(b);
    return Number.isFinite(first) && Number.isFinite(second)
      ? first - second
      : a.localeCompare(b);
  });

  if (bimesters.length === 0) {
    lines.push("Nenhuma avaliação registrada.");
  } else {
    for (const bimester of bimesters) {
      lines.push("", `Bimestre: ${bimester}`);
      for (const item of byBimester.get(bimester) ?? []) {
        lines.push(
          `  Disciplina: ${textValue(item.discipline)} · Avaliação: ${textValue(item.assessment)} · Nota: ${textValue(item.grade)} · Peso: ${textValue(item.weight)} · Presença: ${textValue(item.presence)}`,
        );
      }
    }
  }

  if (occurrences.length > 0) {
    lines.push("", "OCORRÊNCIAS");
    for (const item of occurrences) {
      lines.push(
        `  Data: ${textValue(item.date)} · Tipo: ${textValue(item.type)} · Severidade: ${textValue(item.severity)} · Descrição: ${textValue(item.description)}`,
      );
    }
  }

  const emittedAt = new Date(String(snapshot.emittedAt ?? ""));
  lines.push(
    "",
    `Emitido em: ${Number.isNaN(emittedAt.getTime()) ? textValue(snapshot.emittedAt) : emittedAt.toLocaleString("pt-BR")}`,
    `Emitido por: ${textValue(snapshot.issuerName)}`,
  );

  return lines.join("\n");
}

type StudentForm = {
  name: string;
  birthDate: string;
  cpf: string;
  sex: string;
  birthCity: string;
  birthState: string;
  raceColor: string;
  motherName: string;
  fatherName: string;
  guardianName: string;
  guardianCpf: string;
  guardianUserId: string;
  emergencyPhone: string;
  emergencyPhone2: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  grade: string;
  shift: string;
  classroomId: string;
};

const emptyForm: StudentForm = {
  name: "",
  birthDate: "",
  cpf: "",
  sex: "nao_informado",
  birthCity: "",
  birthState: "",
  raceColor: "nao_informado",
  motherName: "",
  fatherName: "",
  guardianName: "",
  guardianCpf: "",
  guardianUserId: "",
  emergencyPhone: "",
  emergencyPhone2: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  grade: "",
  shift: "Matutino",
  classroomId: "",
};

function toForm(student: StudentItem): StudentForm {
  return {
    name: student.name,
    birthDate: student.birthDate ?? "",
    cpf: student.cpf ?? "",
    sex: student.sex ?? "nao_informado",
    birthCity: student.birthCity ?? "",
    birthState: student.birthState ?? "",
    raceColor: student.raceColor ?? "nao_informado",
    motherName: student.motherName ?? "",
    fatherName: student.fatherName ?? "",
    guardianName: student.guardianName ?? "",
    guardianCpf: student.guardianCpf ?? "",
    guardianUserId: student.guardianUserId ?? "",
    emergencyPhone: student.emergencyPhone ?? "",
    emergencyPhone2: student.emergencyPhone2 ?? "",
    zipCode: student.zipCode ?? "",
    street: student.street ?? "",
    number: student.number ?? "",
    complement: student.complement ?? "",
    neighborhood: student.neighborhood ?? "",
    city: student.city ?? "",
    state: student.state ?? "",
    grade: student.grade ?? "",
    shift: student.shift ?? "Matutino",
    classroomId: student.classroomId ?? "",
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  className = "",
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onBlur?: () => void;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

type Props = {
  schoolId: string;
  classrooms: ClassroomItem[];
  students: StudentItem[];
  capabilities: SchoolCapabilities;
};

export function StudentsPanel({
  schoolId,
  classrooms,
  students,
  capabilities,
}: Props) {
  const router = useRouter();
  const [override, setOverride] = useState<{
    source: StudentItem[];
    items: StudentItem[];
  } | null>(null);
  const items = override?.source === students ? override.items : students;
  function commit(next: StudentItem[]) {
    setOverride({ source: students, items: next });
  }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [docsFor, setDocsFor] = useState<string | null>(null);
  const [docs, setDocs] = useState<{
    birthCertificateStatus: "pendente" | "validado";
    schoolHistoryStatus: "pendente" | "validado";
    residenceProofStatus: "pendente" | "validado";
  }>({
    birthCertificateStatus: "pendente",
    schoolHistoryStatus: "pendente",
    residenceProofStatus: "pendente",
  });
  const [transferFor, setTransferFor] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState("transferido");
  const [transferClassroom, setTransferClassroom] = useState("");
  const [transferDestination, setTransferDestination] = useState("");
  const [transferDate, setTransferDate] = useState(todayDateInput);
  const [transferReason, setTransferReason] = useState("");
  const [transferIssueHistory, setTransferIssueHistory] = useState(false);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [historyText, setHistoryText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof StudentForm>(key: K, value: StudentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function lookupZipCode() {
    const digits = form.zipCode.replace(/\D/g, "");
    if (digits.length !== 8) return;

    try {
      const response = await fetch(`/api/cep/${digits}`);
      if (!response.ok) return;
      const address = (await response.json()) as {
        street?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
      };
      setForm((current) => ({
        ...current,
        street: address.street || current.street,
        complement: address.complement || current.complement,
        neighborhood: address.neighborhood || current.neighborhood,
        city: address.city || current.city,
        state: address.state || current.state,
      }));
    } catch {
      // Consulta é auxiliar: o cadastro continua permitido sem o preenchimento.
    }
  }

  async function submitStudent(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const editing = editingId !== null;
    const url = editing
      ? `/api/schools/${schoolId}/students/${editingId}`
      : `/api/schools/${schoolId}/students`;

    try {
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        error?: string;
        id?: string;
        enrollmentNumber?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar o aluno.");
        return;
      }

      const classroom = classrooms.find((item) => item.id === form.classroomId);
      if (editing) {
        commit(
          items.map((student) =>
            student.id === editingId
              ? {
                  ...student,
                  ...form,
                  name: form.name,
                  classroomName: classroom?.name ?? null,
                  status: student.status,
                  enrollmentNumber: student.enrollmentNumber,
                  birthCertificateStatus: student.birthCertificateStatus,
                  schoolHistoryStatus: student.schoolHistoryStatus,
                  residenceProofStatus: student.residenceProofStatus,
                  docsStatus: student.docsStatus,
                }
              : student,
          ),
        );
        setNotice("Dados cadastrais atualizados.");
      } else {
        const warning = (data as { warning?: string; suggestions?: Array<{ name: string; seatsLeft: number }> }).warning;
        const suggestions = (data as { suggestions?: Array<{ name: string; seatsLeft: number }> }).suggestions ?? [];
        commit([
          ...items,
          {
            ...form,
            id: data.id!,
            enrollmentNumber: data.enrollmentNumber ?? null,
            classroomName: warning ? null : (classroom?.name ?? null),
            classroomId: warning ? null : (form.classroomId || null),
            status: "ativo",
            birthCertificateStatus: "pendente",
            schoolHistoryStatus: "pendente",
            residenceProofStatus: "pendente",
            docsStatus: "pendente",
            transferRecords: [],
          } as StudentItem,
        ]);
        const suggestionText = suggestions.length
          ? ` Sugestões: ${suggestions.map((s) => `${s.name} (${s.seatsLeft} vagas)`).join(", ")}.`
          : "";
        setNotice(
          warning
            ? `Aluno matriculado: ${data.enrollmentNumber}. ${warning}${suggestionText}`
            : `Aluno matriculado: ${data.enrollmentNumber}`,
        );
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(student: StudentItem) {
    setForm(toForm(student));
    setEditingId(student.id);
    setShowForm(true);
    setError("");
    setNotice("");
  }

  function cancelForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  async function saveDocuments(event: FormEvent) {
    event.preventDefault();
    if (!docsFor) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/students/${docsFor}/documents`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(docs),
        },
      );
      const data = (await response.json()) as { error?: string; docsStatus?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível validar a documentação.");
        return;
      }

      const status = data.docsStatus as "pendente" | "validado";
      commit(
        items.map((student) =>
          student.id === docsFor
            ? { ...student, ...docs, docsStatus: status }
            : student,
        ),
      );
      setDocsFor(null);
      setNotice("Situação da documentação atualizada.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTransfer(event: FormEvent) {
    event.preventDefault();
    if (!transferFor) return;

    const destinationSchool = transferDestination.trim();
    if (transferStatus === "transferido" && !destinationSchool) {
      setError("Informe a escola de destino na transferência.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const reason = transferReason.trim();
    const now = new Date().toISOString();
    const transferDateTime = transferDate || now.slice(0, 10);

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/students/${transferFor}/transfer`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: transferStatus,
            classroomId: transferClassroom || null,
            destinationSchool,
            transferDate: transferDateTime,
            reason,
            issueHistory: transferIssueHistory,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        ok?: boolean;
        status?: StudentItem["status"];
        historyIssued?: boolean;
      };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível atualizar a situação.");
        return;
      }

      const historyIssued = Boolean(data.historyIssued);
      const record: HistoryRecordItem = {
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `local-${Date.now()}`,
        destinationSchool,
        transferDate: transferDateTime,
        reason: reason || null,
        note: null,
        historyIssuedAt: historyIssued ? now : null,
        createdAt: now,
      };
      const classroom = classrooms.find((item) => item.id === transferClassroom);
      commit(
        items.map((student) =>
          student.id === transferFor
            ? {
                ...student,
                status: (data.status ?? transferStatus) as StudentItem["status"],
                classroomId: transferClassroom || null,
                classroomName: classroom?.name ?? null,
                transferRecords: [record, ...(student.transferRecords ?? [])],
              }
            : student,
        ),
      );
      setTransferDestination("");
      setTransferDate(todayDateInput());
      setTransferReason("");
      setTransferIssueHistory(false);
      setTransferFor(null);
      setNotice(
        data.historyIssued
          ? "Situação escolar atualizada e histórico escolar emitido."
          : "Situação escolar atualizada.",
      );
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function issueStudentHistory(studentId: string) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/students/${studentId}/history`,
        { method: "POST" },
      );
      const data = (await response.json()) as {
        error?: string;
        snapshot?: HistorySnapshot;
        issuedAt?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível emitir o histórico escolar.");
        return;
      }
      if (!data.snapshot) {
        setError("O servidor não devolveu o histórico escolar.");
        return;
      }

      setHistoryFor(studentId);
      setHistoryText(formatHistoryText(data.snapshot));
      setNotice("Histórico escolar emitido.");
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function copyHistory() {
    if (!historyText) return;
    try {
      if (!navigator.clipboard) {
        setError("Área de transferência indisponível neste navegador.");
        return;
      }
      await navigator.clipboard.writeText(historyText);
      setNotice("Histórico copiado.");
    } catch {
      setError("Não foi possível copiar o histórico.");
    }
  }

  async function removeStudent(id: string) {
    if (!window.confirm("Excluir este aluno e suas solicitações?")) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/schools/${schoolId}/students/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Não foi possível excluir o aluno.");
        return;
      }
      commit(items.filter((student) => student.id !== id));
      setNotice("Aluno excluído.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  const classroomOptions: ReadonlyArray<readonly [string, string]> = [
    ["", "Sem turma"],
    ...classrooms.map(
      (item) =>
        [
          item.id,
          `${item.name} · ${item.shift ?? "Sem turno"} · ${item.occupied}/${item.capacity} vagas`,
        ] as const,
    ),
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Cadastro de alunos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Dados do Censo Escolar, documentação e vínculo escolar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {capabilities.exportStudents && (
            <a href={`/api/schools/${schoolId}/students/export`} className={secondaryButton}>
              <Download className="size-3.5" />
              Exportar CSV
            </a>
          )}
          {capabilities.createStudents && !showForm && (
            <button
              type="button"
              className={primaryButton}
              onClick={() => {
                setForm(emptyForm);
                setEditingId(null);
                setShowForm(true);
              }}
            >
              <Plus className="size-3.5" />
              Novo aluno
            </button>
          )}
        </div>
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

      {showForm && capabilities.createStudents && (
        <form
          onSubmit={submitStudent}
          className="mt-5 space-y-5 rounded-xl border border-slate-200 bg-slate-50/60 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              {editingId ? "Editar aluno" : "Novo aluno"}
            </h3>
            <button type="button" onClick={cancelForm} className="text-slate-500">
              <X className="size-4" />
            </button>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Dados pessoais
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nome completo" value={form.name} onChange={(v) => set("name", v)} required className="lg:col-span-2" />
              <Field label="Data de nascimento" type="date" value={form.birthDate} onChange={(v) => set("birthDate", v)} required />
              <Field label="CPF do aluno" value={form.cpf} onChange={(v) => set("cpf", v)} placeholder="000.000.000-00" />
              <SelectField label="Sexo" value={form.sex} onChange={(v) => set("sex", v)} options={SEX_OPTIONS} required />
              <SelectField label="Cor/raça" value={form.raceColor} onChange={(v) => set("raceColor", v)} options={RACE_OPTIONS} required />
              <Field label="Naturalidade (cidade)" value={form.birthCity} onChange={(v) => set("birthCity", v)} required />
              <Field label="UF de nascimento" value={form.birthState} onChange={(v) => set("birthState", v.toUpperCase())} placeholder="SP" required />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Filiação e responsáveis
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nome da mãe" value={form.motherName} onChange={(v) => set("motherName", v)} required />
              <Field label="Nome do pai" value={form.fatherName} onChange={(v) => set("fatherName", v)} />
              <Field label="Responsável legal/financeiro" value={form.guardianName} onChange={(v) => set("guardianName", v)} required />
              <Field label="CPF do responsável" value={form.guardianCpf} onChange={(v) => set("guardianCpf", v)} placeholder="000.000.000-00" required />
              <Field label="Telefone de emergência" value={form.emergencyPhone} onChange={(v) => set("emergencyPhone", v)} placeholder="(11) 90000-0000" required />
              <Field label="Telefone alternativo" value={form.emergencyPhone2} onChange={(v) => set("emergencyPhone2", v)} />
              <Field label="Usuário responsável (e-mail do sistema)" value={form.guardianUserId} onChange={(v) => set("guardianUserId", v)} placeholder="ID do usuário" className="lg:col-span-2" />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Endereço
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="CEP" value={form.zipCode} onChange={(v) => set("zipCode", v)} onBlur={lookupZipCode} placeholder="01310-100" required />
              <Field label="Logradouro" value={form.street} onChange={(v) => set("street", v)} required className="lg:col-span-2" />
              <Field label="Número" value={form.number} onChange={(v) => set("number", v)} required />
              <Field label="Complemento" value={form.complement} onChange={(v) => set("complement", v)} />
              <Field label="Bairro" value={form.neighborhood} onChange={(v) => set("neighborhood", v)} required />
              <Field label="Cidade" value={form.city} onChange={(v) => set("city", v)} required />
              <Field label="UF" value={form.state} onChange={(v) => set("state", v.toUpperCase())} placeholder="SP" required />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Vínculo escolar
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Ano/série" value={form.grade} onChange={(v) => set("grade", v)} placeholder="5º ano" required />
              <SelectField label="Turma" value={form.classroomId} onChange={(v) => set("classroomId", v)} options={classroomOptions} />
              <SelectField
                label="Turno"
                value={form.shift}
                onChange={(v) => set("shift", v)}
                options={SHIFT_OPTIONS.map((shift) => [shift, shift])}
                required
              />
            </div>
          </fieldset>

          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <ClipboardCheck className="size-3.5" />}
            {editingId ? "Salvar alterações" : "Efetivar matrícula"}
          </button>
        </form>
      )}

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum aluno matriculado.</p>
        ) : (
          items.map((student) => (
            <div key={student.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {student.enrollmentNumber ?? "Sem número"} · {student.classroomName ?? "Sem turma"} · {student.grade ?? "Sem série"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {STATUS_LABELS[student.status] ?? student.status}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      student.docsStatus === "validado"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    Docs: {STATUS_LABELS[student.docsStatus]}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {student.birthDate ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" /> Nasc.: {student.birthDate.split("-").reverse().join("/")}
                  </span>
                ) : null}
                {student.guardianName ? ` · Responsável: ${student.guardianName}` : ""}
                {student.emergencyPhone ? ` · Emergência: ${student.emergencyPhone}` : ""}
              </p>

              {student.transferRecords?.[0] ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Última transferência:{" "}
                  {student.transferRecords[0].destinationSchool || "Escola não informada"} ·{" "}
                  {formatTransferDate(student.transferRecords[0].transferDate)} · Histórico:{" "}
                  {student.transferRecords[0].historyIssuedAt ? "emitido" : "não emitido"}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {capabilities.createStudents && (
                  <button type="button" className={secondaryButton} onClick={() => startEdit(student)}>
                    <Pencil className="size-3.5" /> Editar
                  </button>
                )}
                {capabilities.reviewDocuments && (
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => {
                      setDocsFor(student.id);
                      setDocs({
                        birthCertificateStatus: student.birthCertificateStatus,
                        schoolHistoryStatus: student.schoolHistoryStatus,
                        residenceProofStatus: student.residenceProofStatus,
                      });
                    }}
                  >
                    <ClipboardCheck className="size-3.5" /> Documentação
                  </button>
                )}
                {capabilities.transferStudents && (
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => {
                      setTransferFor(student.id);
                      setTransferStatus("transferido");
                      setTransferClassroom(student.classroomId ?? "");
                      setTransferDestination("");
                      setTransferDate(todayDateInput());
                      setTransferReason("");
                      setTransferIssueHistory(false);
                    }}
                  >
                    Transferir / concluir
                  </button>
                )}
                {capabilities.issueHistory && (
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => issueStudentHistory(student.id)}
                  >
                    Emitir histórico
                  </button>
                )}
                {capabilities.manageStudents && (
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => removeStudent(student.id)}
                  >
                    <Trash2 className="size-3.5" /> Excluir
                  </button>
                )}
              </div>

              {docsFor === student.id && (
                <form onSubmit={saveDocuments} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
                  <SelectField
                    label="Certidão de nascimento"
                    value={docs.birthCertificateStatus}
                    onChange={(v) =>
                      setDocs((c) => ({
                        ...c,
                        birthCertificateStatus: v as "pendente" | "validado",
                      }))
                    }
                    options={[["pendente", "Pendente"], ["validado", "Validado"]]}
                  />
                  <SelectField
                    label="Histórico escolar"
                    value={docs.schoolHistoryStatus}
                    onChange={(v) =>
                      setDocs((c) => ({
                        ...c,
                        schoolHistoryStatus: v as "pendente" | "validado",
                      }))
                    }
                    options={[["pendente", "Pendente"], ["validado", "Validado"]]}
                  />
                  <SelectField
                    label="Comprovante de residência"
                    value={docs.residenceProofStatus}
                    onChange={(v) =>
                      setDocs((c) => ({
                        ...c,
                        residenceProofStatus: v as "pendente" | "validado",
                      }))
                    }
                    options={[["pendente", "Pendente"], ["validado", "Validado"]]}
                  />
                  <div className="flex gap-2 sm:col-span-3">
                    <button type="submit" disabled={saving} className={primaryButton}>Salvar validação</button>
                    <button type="button" className={secondaryButton} onClick={() => setDocsFor(null)}>Cancelar</button>
                  </div>
                </form>
              )}

              {transferFor === student.id && (
                <form onSubmit={saveTransfer} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                  <SelectField
                    label="Nova situação"
                    value={transferStatus}
                    onChange={setTransferStatus}
                    options={[["transferido", "Transferido"], ["concluido", "Concluído"]]}
                  />
                  <SelectField label="Turma" value={transferClassroom} onChange={setTransferClassroom} options={classroomOptions} />
                  <Field
                    label="Escola de destino"
                    value={transferDestination}
                    onChange={setTransferDestination}
                    placeholder="Nome da escola de destino"
                    required={transferStatus === "transferido"}
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Data da transferência"
                    type="date"
                    value={transferDate}
                    onChange={setTransferDate}
                    className="sm:col-span-2"
                  />
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">Motivo</span>
                    <textarea
                      rows={3}
                      value={transferReason}
                      onChange={(event) => setTransferReason(event.target.value)}
                      placeholder="Motivo da transferência ou conclusão"
                      className={`${inputClass} resize-y`}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={transferIssueHistory}
                      onChange={(event) => setTransferIssueHistory(event.target.checked)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Emitir histórico escolar nesta transferência
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="submit" disabled={saving} className={primaryButton}>Confirmar</button>
                    <button type="button" className={secondaryButton} onClick={() => setTransferFor(null)}>Cancelar</button>
                  </div>
                </form>
              )}

              {historyFor === student.id && (
                <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">
                      Histórico escolar de {student.name}
                    </p>
                    <div className="flex gap-2">
                      <button type="button" className={secondaryButton} onClick={copyHistory}>
                        Copiar
                      </button>
                      <button
                        type="button"
                        className={secondaryButton}
                        onClick={() => {
                          setHistoryFor(null);
                          setHistoryText("");
                        }}
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
                    {historyText}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
