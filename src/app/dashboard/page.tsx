import { ArrowRight, Building2, Plus } from "lucide-react";
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

  const counts = Object.keys(SEGMENTS).reduce<Record<string, number>>(
    (acc, key) => {
      acc[key] = items.filter((item) => item.segment === key).length;
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-600">Visão geral</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {creator ? "Minhas escolas" : "Minha escola"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {creator
              ? "Gerencie todas as escolas criadas na plataforma."
              : "Escolas às quais você tem acesso como administrador."}
          </p>
        </div>
        {creator && (
          <Link
            href="/dashboard/escolas/nova"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Nova escola
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Escolas cadastradas
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{items.length}</p>
        </div>
        {(Object.keys(SEGMENTS) as SchoolSegment[]).map((segment) => (
          <div
            key={segment}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {SEGMENTS[segment].shortLabel}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {counts[segment] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Building2 className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Nenhuma escola vinculada
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {creator
              ? "Comece informando o tipo de ensino e os dados da instituição."
              : "Entre em contato com o criador da plataforma para receber acesso à sua escola."}
          </p>
          {creator && (
            <Link
              href="/dashboard/escolas/nova"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Configurar primeira escola
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((school) => {
            const segment = SEGMENTS[school.segment];
            return (
              <Link
                key={school.id}
                href={`/dashboard/escolas/${school.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {segment.shortLabel}
                  </span>
                  <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                </div>
                <h2 className="mt-4 text-base font-semibold leading-6 text-slate-900">
                  {school.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {[school.city, school.state].filter(Boolean).join(" / ") ||
                    "Endereço não informado"}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span>{getModules(school.segment).length} módulos ativos</span>
                  <span>Gerenciar</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
