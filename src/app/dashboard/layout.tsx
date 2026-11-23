import { eq } from "drizzle-orm";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";
import { db } from "@/lib/db/client";
import { schoolMembers } from "@/lib/db/schema";
import { isPlatformCreator } from "@/lib/schools/access";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const creator = await isPlatformCreator(session.user.id);

  const [membership] = creator
    ? []
    : await db
        .select({ role: schoolMembers.role })
        .from(schoolMembers)
        .where(eq(schoolMembers.userId, session.user.id))
        .limit(1);

  const roleLabel = creator
    ? "Criador"
    : membership?.role === "professor"
      ? "Professor"
      : "Administrador da escola";

  const initials = session.user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <GraduationCap className="size-4" />
              </span>
              <span className="text-base font-bold tracking-tight text-slate-900">
                EduFlux
              </span>
            </Link>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" />
            <Link
              href="/dashboard"
              className="hidden text-sm font-semibold text-slate-700 sm:block"
            >
              {creator ? "Escolas" : "Minha escola"}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-4 text-slate-800">
                {session.user.name}
              </p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {initials || "AD"}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
