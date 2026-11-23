"use client";

import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Building2,
  Check,
  Clipboard,
  GraduationCap,
  LoaderCircle,
  School,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { formatCep, onlyDigits, type CepAddress } from "@/lib/schools/cep";
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
  administrativeDependency: "publica" | "privada" | "";
  maintainerName: string;
  name: string;
  legalName: string;
  cnpj: string;
  inepCode: string;
  foundedYear: string;
  phone: string;
  email: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  adminName: string;
  adminEmail: string;
};

const initialFields: FormFields = {
  segment: "",
  administrativeDependency: "",
  maintainerName: "",
  name: "",
  legalName: "",
  cnpj: "",
  inepCode: "",
  foundedYear: "",
  phone: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  adminName: "",
  adminEmail: "",
};

const steps = ["Tipo de ensino", "Dados da escola", "Administrador"];

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
  const [cepStatus, setCepStatus] = useState<
    "idle" | "loading" | "not-found" | "error"
  >("idle");
  const [created, setCreated] = useState<{
    id: string;
    adminEmail: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const cepRequest = useRef(0);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function handleZipCodeChange(value: string) {
    const digits = onlyDigits(value).slice(0, 8);
    const requestId = ++cepRequest.current;

    setFields((current) => ({ ...current, zipCode: digits }));
    setError("");

    if (digits.length !== 8) {
      setCepStatus("idle");
      return;
    }

    setCepStatus("loading");

    try {
      const response = await fetch(`/api/cep/${digits}`);
      if (requestId !== cepRequest.current) return;

      if (!response.ok) {
        setCepStatus(response.status === 404 ? "not-found" : "error");
        return;
      }

      const address = (await response.json()) as CepAddress;
      setFields((current) => ({
        ...current,
        street: address.street || current.street,
        complement: current.complement || address.complement,
        neighborhood: address.neighborhood || current.neighborhood,
        city: address.city || current.city,
        state: address.state || current.state,
      }));
      setCepStatus("idle");
    } catch {
      if (requestId === cepRequest.current) setCepStatus("error");
    }
  }

  function validateStep() {
    if (step === 0 && !fields.segment) {
      return "Selecione o tipo de ensino da instituição.";
    }
    if (step === 1) {
      if (!fields.administrativeDependency) {
        return "Selecione se a escola é pública ou privada.";
      }
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
      if (!/^\d{8}$/.test(fields.zipCode)) {
        return "Informe um CEP com 8 dígitos.";
      }
      if (fields.state.trim().length !== 2) {
        return "Informe a sigla do estado com 2 letras.";
      }
      if (fields.inepCode && !/^\d{8}$/.test(onlyDigits(fields.inepCode))) {
        return "O código INEP deve conter 8 dígitos.";
      }
      if (fields.foundedYear) {
        const year = Number(fields.foundedYear);
        if (
          !/^\d{4}$/.test(fields.foundedYear) ||
          year < 1800 ||
          year > new Date().getFullYear()
        ) {
          return "Informe um ano de fundação válido.";
        }
      }
    }
    if (step === 2) {
      if (!fields.adminName.trim()) {
        return "Informe o nome do administrador da escola.";
      }
      if (!/^\S+@\S+\.\S+$/.test(fields.adminEmail.trim())) {
        return "Informe um e-mail válido para o administrador.";
      }
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
    const data = (await response.json()) as {
      id?: string;
      adminEmail?: string;
      temporaryPassword?: string;
      error?: string;
    };

    if (
      !response.ok ||
      !data.id ||
      !data.adminEmail ||
      !data.temporaryPassword
    ) {
      setError(data.error ?? "Não foi possível salvar a configuração.");
      setPending(false);
      return;
    }

    setCreated({
      id: data.id,
      adminEmail: data.adminEmail,
      temporaryPassword: data.temporaryPassword,
    });
    setPending(false);
  }

  async function copyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const segment = fields.segment ? SEGMENTS[fields.segment] : null;
  const modules = fields.segment
    ? getModules(
        fields.segment,
        fields.administrativeDependency || undefined,
      )
    : [];
  const cepHint =
    cepStatus === "loading"
      ? "Buscando endereço..."
      : cepStatus === "not-found"
        ? "CEP não encontrado. Preencha o endereço manualmente."
        : cepStatus === "error"
          ? "Consulta indisponível. Preencha o endereço manualmente."
          : "Digite 8 dígitos para preencher o endereço automaticamente";

  if (created) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="size-6" />
          </span>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            Escola criada com sucesso
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Envie as credenciais abaixo ao administrador. Ele poderá fazer login
            e gerenciar apenas esta escola.
          </p>
        </div>

        <dl className="mt-8 grid gap-4 rounded-xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Escola</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{fields.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Administrador</dt>
            <dd className="mt-0.5 font-medium text-slate-800">
              {fields.adminName}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">E-mail de acesso</dt>
            <dd className="mt-0.5 font-medium text-slate-800">
              {created.adminEmail}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Senha provisória
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <code className="break-all font-mono text-sm text-slate-900">
              {created.temporaryPassword}
            </code>
            <button
              type="button"
              onClick={copyPassword}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <Clipboard className="size-4" />
              {copied ? "Copiada" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            A senha aparece apenas neste momento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/dashboard/escolas/${created.id}`)}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Abrir painel da escola
          <ArrowRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-8 flex items-center gap-2">
        {steps.map((label, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <div
                  className={`flex items-center gap-2 text-xs font-semibold ${
                    active
                      ? "text-emerald-700"
                      : done
                        ? "text-slate-700"
                        : "text-slate-400"
                  }`}
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-[11px] ${
                      active
                        ? "bg-emerald-600 text-white"
                        : done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span className="truncate">{label}</span>
                </div>
                <div
                  className={`h-1 rounded-full ${
                    done || active ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Que tipo de instituição você vai configurar?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Essa escolha define quais módulos estarão disponíveis no painel da
              escola.
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
                    className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                        : "border-slate-200 bg-white hover:border-emerald-300"
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
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {option.audience}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
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

            <div className="mt-6 space-y-4">
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">
                  Dependência administrativa
                  <span className="ml-0.5 text-emerald-600">*</span>
                </legend>
                <p className="mt-1 text-xs text-slate-500">
                  Define a estrutura, módulos e validações da escola.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {([
                    {
                      id: "publica" as const,
                      label: "Pública",
                      description:
                        "Mantida por Prefeitura/Secretaria. Sem mensalidades; foco em Censo, transporte, merenda e programas sociais.",
                    },
                    {
                      id: "privada" as const,
                      label: "Privada",
                      description:
                        "Mantida por empresa/grupo (CNPJ). Habilita financeiro, contratos, responsáveis financeiro/pedagógico e RH.",
                    },
                  ]).map((option) => {
                    const selected =
                      fields.administrativeDependency === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          update("administrativeDependency", option.id)
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                            : "border-slate-200 bg-white hover:border-emerald-300"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <Field
                label={
                  fields.administrativeDependency === "publica"
                    ? "Mantenedora / Secretaria de Educação"
                    : "Mantenedora / Rede / Grupo educacional"
                }
                value={fields.maintainerName}
                onChange={(value) => update("maintainerName", value)}
                placeholder={
                  fields.administrativeDependency === "publica"
                    ? "Prefeitura Municipal de ..."
                    : "Grupo Educacional ..."
                }
                hint="Opcional. Representa a mantenedora/rede (tenant) da escola."
              />

              <Field
                label="Nome da escola"
                value={fields.name}
                onChange={(value) => update("name", value)}
                placeholder="Escola Municipal Estrela do Sul"
                required
              />
              <Field
                label="Razão Social"
                value={fields.legalName}
                onChange={(value) => update("legalName", value)}
                placeholder="Mantenedora da Escola Estrela do Sul Ltda."
                hint="Opcional"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="CNPJ"
                  value={fields.cnpj}
                  onChange={(value) => update("cnpj", value)}
                  placeholder="Somente números"
                  hint="Opcional"
                  inputMode="numeric"
                  maxLength={18}
                />
                <Field
                  label="Código INEP"
                  value={fields.inepCode}
                  onChange={(value) => update("inepCode", value)}
                  placeholder="8 dígitos"
                  hint="Opcional"
                  inputMode="numeric"
                  maxLength={8}
                />
                <Field
                  label="Ano de fundação"
                  value={fields.foundedYear}
                  onChange={(value) => update("foundedYear", value)}
                  placeholder="2020"
                  hint="Opcional"
                  type="number"
                  inputMode="numeric"
                  maxLength={4}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="E-mail institucional"
                  value={fields.email}
                  onChange={(value) => update("email", value)}
                  placeholder="contato@escola.com.br"
                  type="email"
                  inputMode="email"
                />
                <Field
                  label="Telefone da escola"
                  value={fields.phone}
                  onChange={(value) => update("phone", value)}
                  placeholder="(11) 4000-0000"
                  inputMode="tel"
                />
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Building2 className="size-4 text-emerald-600" />
                  Endereço
                </p>
                <div className="grid gap-4 sm:grid-cols-6">
                  <Field
                    label="CEP"
                    value={formatCep(fields.zipCode)}
                    onChange={handleZipCodeChange}
                    placeholder="00000-000"
                    required
                    hint={cepHint}
                    inputMode="numeric"
                    maxLength={9}
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
                    onChange={(value) => update("state", value.toUpperCase())}
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
              Administrador da escola
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Crie o usuário que terá acesso exclusivo ao gerenciamento desta
              escola.
            </p>

            <section className="mt-6 space-y-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <UserRound className="size-4 text-emerald-600" />
                Dados de acesso
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nome completo"
                  value={fields.adminName}
                  onChange={(value) => update("adminName", value)}
                  placeholder="João da Silva"
                  required
                />
                <Field
                  label="E-mail"
                  value={fields.adminEmail}
                  onChange={(value) => update("adminEmail", value)}
                  placeholder="admin@escola.com.br"
                  type="email"
                  inputMode="email"
                  required
                  hint="Será usado para fazer login"
                />
              </div>
              <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Uma senha provisória será gerada ao final e exibida apenas uma
                vez. Você deverá enviá-la ao administrador.
              </p>
            </section>

            <div className="mt-6 rounded-xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-800">
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
                  <dt className="text-xs text-slate-500">Dependência administrativa</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {fields.administrativeDependency === "publica"
                      ? "Pública"
                      : fields.administrativeDependency === "privada"
                        ? "Privada"
                        : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Mantenedora / Rede</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {fields.maintainerName || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Escola</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {fields.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Código INEP</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {fields.inepCode || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Administrador</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {fields.adminName || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Endereço</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {fields.street}, {fields.number}
                    {fields.complement ? ` — ${fields.complement}` : ""} ·{" "}
                    {fields.neighborhood} · {fields.city}/
                    {fields.state.toUpperCase()}
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
            className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Continuar
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
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
