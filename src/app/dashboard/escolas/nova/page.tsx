import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SchoolWizard } from "@/components/school-wizard";
import { requireCreator } from "@/lib/schools/access";

export const instant = false;

export default async function NewSchoolPage() {
  await requireCreator();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="size-4" />
        Voltar para minhas escolas
      </Link>

      <div>
        <p className="text-sm font-medium text-emerald-600">Configuração inicial</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Nova escola
        </h1>
      </div>

      <SchoolWizard />
    </div>
  );
}
