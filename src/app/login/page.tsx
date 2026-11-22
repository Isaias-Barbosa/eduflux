import { Check, GraduationCap } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { auth } from "@/lib/auth";

export const instant = false;

const highlights = [
  "Configuração inicial por tipo de instituição",
  "Módulos pedagógicos diferentes para cada segmento",
  "Várias escolas gerenciadas em um só lugar",
];

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="flex flex-1 bg-white">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-emerald-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-700/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 size-72 rounded-full bg-teal-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <GraduationCap className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">EduFlux</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            A plataforma cresce junto com a sua escola.
          </h2>
          <p className="mt-4 text-sm leading-7 text-emerald-100/80">
            Do jardim de infância ao ensino médio, cada instituição recebe os
            módulos certos para a sua rotina pedagógica.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
                  <Check className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-emerald-200/60">© EduFlux</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <Suspense fallback={<p className="text-sm text-slate-500">Carregando…</p>}>
          <AuthForm />
        </Suspense>
      </section>
    </main>
  );
}
