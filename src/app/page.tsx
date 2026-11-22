import { ArrowRight, Baby, GraduationCap, School, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SEGMENTS } from "@/lib/schools/segments";

export const instant = false;

const segmentIcons = {
  infantil: Baby,
  fundamental: School,
  medio: GraduationCap,
};

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col bg-slate-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            EduFlux
          </span>
        </div>
        <Link
          href="/login"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/70"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20 pt-16 sm:pt-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Gestão escolar que se adapta à sua instituição
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            Um sistema diferente para{" "}
            <span className="text-emerald-600">cada fase do ensino.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Configure sua escola em poucos passos. A plataforma identifica o
            segmento — jardim de infância, fundamental ou médio — e habilita os
            módulos pedagógicos adequados para aquela realidade.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/login?mode=signup"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Criar minha conta
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Já tenho conta
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {Object.values(SEGMENTS).map((segment) => {
            const Icon = segmentIcons[segment.id];
            return (
              <div
                key={segment.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-slate-900">
                  {segment.label}
                </h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-emerald-700">
                  {segment.audience}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {segment.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        EduFlux · Configuração escolar é o primeiro passo de cada contrato.
      </footer>
    </main>
  );
}
