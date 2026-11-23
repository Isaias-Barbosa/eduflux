"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type AuditLogItem = {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string | Date;
};

export function AuditPanel({ schoolId }: { schoolId: string }) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/audit`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        logs?: AuditLogItem[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível carregar a auditoria.");
        return;
      }
      setLogs(data.logs ?? []);
    } catch {
      setError("Não foi possível carregar a auditoria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load depends only on schoolId
  }, [schoolId]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Auditoria</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registro das ações administrativas realizadas nesta escola.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-slate-300"
        >
          <RefreshCw className="size-3.5" />
          Atualizar
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="size-4 animate-spin" /> Carregando logs...
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma ação registrada ainda.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-800">{log.summary}</p>
                <span className="text-[11px] text-slate-500">
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {log.actorName} · {log.actorRole} · {log.action}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
