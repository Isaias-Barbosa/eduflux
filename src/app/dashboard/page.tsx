import { ArrowRight, Building2, Landmark, Plus, School2, Shield } from "lucide-react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/client";
import { schools, schoolMembers } from "@/lib/db/schema";
import { isPlatformCreator } from "@/lib/schools/access";
import { SEGMENTS, getModules, type SchoolSegment } from "@/lib/schools/segments";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function DashboardPage() {
  const session = await requireUser();
  const creator = await isPlatformCreator(session.user.id);

  const rows = creator
    ? await db
        .select({ school: schools })
        .from(schools)
        .orderBy(desc(schools.createdAt))
    : await db
        .select({ school: schools })
        .from(schoolMembers)
        .innerJoin(schools, eq(schoolMembers.schoolId, schools.id))
        .where(eq(schoolMembers.userId, session.user.id))
        .orderBy(desc(schools.createdAt));

  const items = rows.map((row) => row.school);

  if (!creator && items.length === 1) {
    redirect(`/dashboard/escolas/${items[0].id}`);
  }

  const bySegment = items.reduce<Record<SchoolSegment, number>>(
    (acc, school) => {
      acc[school.segment] += 1;
      return acc;
    },
    { infantil: 0, fundamental: 0, medio: 0 },
  );
  const publicCount = items.filter((s) => s.administrativeDependency === "publica").length;
  const privateCount = items.filter((s) => s.administrativeDependency === "privada").length;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-emerald-50/40 to-slate-50 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-emerald-100/50 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Shield className="size-3.5" />
              {creator ? "Painel do criador" : "Painel administrativo"}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Gestão escolar
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {creator
                ? "Controle escolas, dependência administrativa, equipes e estrutura em um único painel."
                : "Acesse as escolas sob sua responsabilidade e gerencie equipe, turmas e operação."}
            </p>
          </div>
          {creator && (
            <Link
              href="/dashboard/escolas/nova"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="size-4" />
              Nova escola
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Escolas cadastradas</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{items.length}</p>
          <p className="mt-1 text-xs text-slate-500">{publicCount} públicas · {privateCount} privadas</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500"><Landmark className="size-3.5" />Públicas</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{publicCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500"><Building2 className="size-3.5" />Privadas</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{privateCount}</p>
        </div>
        {(Object.keys(SEGMENTS) as SchoolSegment[]).map((id) => (
          <div key={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{SEGMENTS[id].shortLabel}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{bySegment[id]}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Escolas</h2>
          <span className="text-xs text-slate-400">
            {items.length} {items.length === 1 ? "resultado" : "resultados"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <School2 className="size-7" />
            </div>
            <p className="mt-5 text-base font-semibold text-slate-800">Nenhuma escola cadastrada</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {creator
                ? "Cadastre a primeira escola definindo se é pública ou privada, o tipo de ensino e o administrador."
                : "Você ainda não tem acesso a nenhuma escola. Solicite ao criador da plataforma."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((school) => {
              const segment = SEGMENTS[school.segment];
              const isPublic = school.administrativeDependency === "publica";
              return (
                <article
                  key={school.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isPublic ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>
                          {isPublic ? "Pública" : "Privada"}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          {segment.shortLabel}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {school.city}/{school.state}
                        </span>
                      </div>
                      <h3 className="mt-3 truncate text-lg font-semibold text-slate-900">{school.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {school.maintainerName ? `${school.maintainerName} · ` : ""}
                        {getModules(school.segment, school.administrativeDependency).length} módulos · {school.status === "ativa" ? "Ativa" : "Inativa"}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/escolas/${school.id}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition group-hover:border-emerald-300 group-hover:text-emerald-700"
                    >
                      Gerenciar
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
