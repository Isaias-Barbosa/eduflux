"use client";

import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Building2,
  Check,
  GraduationCap,
  LoaderCircle,
  School,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  SEGMENTS,
  SEGMENT_IDS,
  getModules,
  type SchoolSegment,
} from "@/lib/schools/segments";

const segmentIcons: Record<SchoolSegment, LucideIcon> = {
  infantil: Baby,
  fundamental: School,
  medio: GraduationCap,
};

type FormFields = {
  segment: SchoolSegment | "";
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  directorName: string;
  directorEmail: string;
  directorPhone: string;
};

const initialFields: FormFields = {
  segment: "",
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  directorName: "",
  directorEmail: "",
  directorPhone: "",
};

const steps = ["Tipo de ensino", "Dados da escola", "Direção e revisão"];

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  hint,
  type = "text",
  maxLength,
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  type?: string;
  maxLength?: number;
  inputMode?: "numeric" | "tel" | "email" | "text";
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-emerald-600">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function SchoolWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<FormFields>(initialFields);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function validateStep() {
    if (step === 0 && !fields.segment) {
      return "Selecione o tipo de ensino da instituição.";
    }
    if (step === 1) {
      const required: (keyof FormFields)[] = [
        "name",
        "zipCode",
        "street",
        "number",
        "neighborhood",
        "city",
        "state",
      ];
      if (required.some((key) => !String(fields[key]).trim())) {
        return "Preencha os campos marcados com *.";
      }
      if (fields.state.trim().length !== 2) {
        return "Informe a sigla do estado com 2 letras.";
      }
    }
    if (step === 2 && !fields.directorName.trim()) {
      return "Informe o nome da pessoa responsável pela direção.";
    }
    return "";
  }

  function goNext() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((current) => current + 1);
  }

  async function submit() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }

    setPending(true);
    setError("");

    const response = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = (await response.json()) as { id?: string; error?: string };

    if (!response.ok || !data.id) {
      setError(data.error ?? "Não foi possível salvar a configuração.");
      setPending(false);
      return;
    }

    router.push(`/dashboard/escolas/${data.id}`);
    router.refresh();
  }

  const segment = fields.segment ? SEGMENTS[fields.segment] : null;
  const modules = fields.segment ? getModules(fields.segment) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-8 flex items-center gap-2">
        {steps.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <div
                className={`h-1.5 rounded-full transition ${
                  index <= step ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  index === step
                    ? "text-emerald-700"
                    : index < step
                      ? "text-slate-600"
                      : "text-slate-400"
                }`}
              >
                {index + 1}. {label}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Que tipo de instituição você vai configurar?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Essa escolha define quais módulos estarão disponíveis no painel
              da escola.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {SEGMENT_IDS.map((id) => {
                const option = SEGMENTS[id];
                const Icon = segmentIcons[id];
                const selected = fields.segment === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update("segment", id)}
                    className={`relative rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-100"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`flex size-10 items-center justify-center rounded-lg ${
                        selected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="mt-4 block text-sm font-semibold text-slate-900">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {option.audience}
                    </span>
                    {selected && (
                      <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {segment && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Módulos que serão habilitados
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {modules.map((module) => (
                    <span
                      key={module.id}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
                    >
                      {module.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Dados da instituição
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Informações que identificarão a escola no sistema e nos
              comunicados.
            </p>

            <div className="mt-6 space-y-5">
              <Field
                label="Nome da escola"
                value={fields.name}
                onChange={(value) => update("name", value)}
                placeholder="Escola Municipal Estrela do Sul"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="CNPJ"
                  value={fields.cnpj}
                  onChange={(value) => update("cnpj", value)}
                  placeholder="Somente números"
                  hint="Opcional nesta etapa"
                  inputMode="numeric"
                  maxLength={14}
                />
                <Field
                  label="Telefone da escola"
                  value={fields.phone}
                  onChange={(value) => update("phone", value)}
                  placeholder="(11) 4000-0000"
                  inputMode="tel"
                />
              </div>
              <Field
                label="E-mail institucional"
                value={fields.email}
                onChange={(value) => update("email", value)}
                placeholder="contato@escola.com.br"
                type="email"
                inputMode="email"
              />

              <div className="border-t border-slate-100 pt-5">
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Building2 className="size-4 text-emerald-600" />
                  Endereço
                </p>
                <div className="grid gap-4 sm:grid-cols-6">
                  <Field
                    label="CEP"
                    value={fields.zipCode}
                    onChange={(value) => update("zipCode", value)}
                    placeholder="00000000"
                    required
                    inputMode="numeric"
                    maxLength={8}
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Rua / Avenida"
                    value={fields.street}
                    onChange={(value) => update("street", value)}
                    placeholder="Rua das Flores"
                    required
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Número"
                    value={fields.number}
                    onChange={(value) => update("number", value)}
                    placeholder="123"
                    required
                    className="sm:col-span-1"
                  />
                  <Field
                    label="Complemento"
                    value={fields.complement}
                    onChange={(value) => update("complement", value)}
                    placeholder="Sala 2"
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Bairro"
                    value={fields.neighborhood}
                    onChange={(value) => update("neighborhood", value)}
                    placeholder="Centro"
                    required
                    className="sm:col-span-3"
                  />
                  <Field
                    label="Cidade"
                    value={fields.city}
                    onChange={(value) => update("city", value)}
                    placeholder="São Paulo"
                    required
                    className="sm:col-span-4"
                  />
                  <Field
                    label="UF"
                    value={fields.state}
                    onChange={(value) => update("state", value.slice(0, 2))}
                    placeholder="SP"
                    required
                    maxLength={2}
                    className="sm:col-span-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Direção e revisão
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Confira os dados antes de concluir a configuração.
            </p>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nome da diretora / diretor"
                  value={fields.directorName}
                  onChange={(value) => update("directorName", value)}
                  placeholder="Maria da Silva"
                  required
                />
                <Field
                  label="E-mail da direção"
                  value={fields.directorEmail}
                  onChange={(value) => update("directorEmail", value)}
                  placeholder="direcao@escola.com.br"
                  type="email"
                  inputMode="email"
                />
              </div>
              <Field
                label="Telefone da direção"
                value={fields.directorPhone}
                onChange={(value) => update("directorPhone", value)}
                placeholder="(11) 90000-0000"
                inputMode="tel"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <UserRound className="size-4 text-emerald-600" />
                  Resumo da configuração
                </p>
                <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500">Tipo de ensino</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {segment?.label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Escola</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {fields.name}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500">Endereço</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {fields.street}, {fields.number}
                      {fields.complement ? ` — ${fields.complement}` : ""} ·{" "}
                      {fields.neighborhood} · {fields.city}/{fields.state.toUpperCase()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Direção</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {fields.directorName || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Módulos ativos</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {modules.length}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep((current) => Math.max(0, current - 1));
            }}
            disabled={step === 0 || pending}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:invisible"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Continuar
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              Concluir configuração
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
