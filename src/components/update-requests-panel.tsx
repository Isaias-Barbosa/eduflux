"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { UpdateRequestItem } from "./school-types";

const primaryButton =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60";

const secondaryButton =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const FIELD_LABELS: Record<string, string> = {
  phone: "Telefone",
  emergencyPhone: "Telefone de emergência",
  street: "Logradouro",
  number: "Número",
  complement: "Complemento",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "UF",
  zipCode: "CEP",
  guardianName: "Responsável",
  name: "Nome completo",
};

export function UpdateRequestsPanel({
  schoolId,
  requests,
}: {
  schoolId: string;
  requests: UpdateRequestItem[];
}) {
  const router = useRouter();
  const [override, setOverride] = useState<{
    source: UpdateRequestItem[];
    items: UpdateRequestItem[];
  } | null>(null);
  const items = override?.source === requests ? override.items : requests;
  function commit(next: UpdateRequestItem[]) {
    setOverride({ source: requests, items: next });
  }
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function review(id: string, decision: "aprovado" | "rejeitado") {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/update-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = (await response.json()) as { error?: string; status?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível analisar a solicitação.");
        return;
      }
      commit(
        items.map((item) =>
          item.id === id ? { ...item, status: data.status as UpdateRequestItem["status"] } : item,
        ),
      );
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">
        Solicitações de alteração cadastral
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Pedidos enviados por responsáveis e alunos.
      </p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma solicitação.</p>
        ) : (
          items.map((item) => {
            let fields: Record<string, string> = {};
            try {
              fields = JSON.parse(item.payload) as Record<string, string>;
            } catch {
              fields = {};
            }

            return (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.studentName}</p>
                    <p className="text-xs text-slate-500">
                      {item.requesterName} · {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                {item.note && <p className="mt-3 text-sm text-slate-700">{item.note}</p>}
                {Object.keys(fields).length > 0 && (
                  <dl className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
                    {Object.entries(fields).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-slate-500">{FIELD_LABELS[key] ?? key}</dt>
                        <dd className="font-medium text-slate-800">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {item.reviewNote && (
                  <p className="mt-2 text-xs text-slate-500">Parecer: {item.reviewNote}</p>
                )}
                {item.status === "pendente" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={primaryButton}
                      disabled={saving}
                      onClick={() => review(item.id, "aprovado")}
                    >
                      <Check className="size-3.5" /> Aprovar
                    </button>
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={saving}
                      onClick={() => review(item.id, "rejeitado")}
                    >
                      <X className="size-3.5" /> Rejeitar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
