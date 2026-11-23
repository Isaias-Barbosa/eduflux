import { and, eq } from "drizzle-orm";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db/client";
import { schools, schoolMembers } from "@/lib/db/schema";
import { SEGMENTS, getModules } from "@/lib/schools/segments";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function SchoolDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser();

  const rows = await db
    .select({ school: schools })
    .from(schools)
    .innerJoin(schoolMembers, eq(schoolMembers.schoolId, schools.id))
    .where(
      and(eq(schools.id, id), eq(schoolMembers.userId, session.user.id)),
    )
    .limit(1);

  if (rows.length === 0) notFound();

  const school = rows[0].school;
  const segment = SEGMENTS[school.segment];
  const modules = getModules(school.segment);
  const address = [
    `${school.street}, ${school.number}`,
    school.complement,
    school.neighborhood,
    `${school.city}/${school.state}`,
    school.zipCode ? `CEP ${school.zipCode}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
        <span className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700">
          Identificador: {school.slug}
        </span>
      </div>

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
            {school.cnpj && (
              <div>
                <dt className="text-xs text-slate-500">CNPJ</dt>
                <dd className="mt-0.5 text-slate-700">{school.cnpj}</dd>
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
            Diretoria e Equipe Pedagógica
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Diretora Geral</dt>
              <dd className="mt-0.5 font-medium text-slate-800">
                {school.directorName}
              </dd>
            </div>
            {school.pedagogicalCoordinator && (
              <div>
                <dt className="text-xs text-slate-500">
                  Coordenador Pedagógico
                </dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {school.pedagogicalCoordinator}
                </dd>
              </div>
            )}
            {school.secretaryName && (
              <div>
                <dt className="text-xs text-slate-500">Secretaria Escolar</dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {school.secretaryName}
                </dd>
              </div>
            )}
            {school.directorEmail && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="size-4 text-slate-400" />
                {school.directorEmail}
              </div>
            )}
            {school.directorPhone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="size-4 text-slate-400" />
                {school.directorPhone}
              </div>
            )}
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
            <dt className="text-xs text-slate-500">
              Turnos de funcionamento
            </dt>
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
              Habilitados para {segment.label.toLowerCase()}.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {modules.length} módulos
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {modules.map((module) => (
            <div
              key={module.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-3" />
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
          ))}
        </div>

        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Os módulos estão definidos. A próxima etapa do projeto é implementar
          os fluxos de cada um deles por segmento.
        </p>
      </section>
    </div>
  );
}
