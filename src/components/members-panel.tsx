"use client";

import { Clipboard, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { MemberItem } from "./school-types";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60";

const ROLE_OPTIONS = [
  ["admin", "Administrador / TI"],
  ["secretaria", "Secretaria"],
  ["auxiliar", "Auxiliar Administrativo"],
  ["direcao", "Coordenação / Direção"],
  ["professor", "Professor"],
  ["responsavel", "Responsável / Aluno"],
] as const;

type Props = {
  schoolId: string;
  members: MemberItem[];
};

export function MembersPanel({ schoolId, members }: Props) {
  const router = useRouter();
  const [override, setOverride] = useState<{
    source: MemberItem[];
    items: MemberItem[];
  } | null>(null);
  const items = override?.source === members ? override.items : members;
  function commit(next: MemberItem[]) {
    setOverride({ source: members, items: next });
  }
  const [form, setForm] = useState({ name: "", email: "", role: "secretaria" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/schools/${schoolId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        error?: string;
        id?: string;
        temporaryPassword?: string | null;
      };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível adicionar o membro.");
        return;
      }

      commit([
        ...items,
        {
          id: data.id!,
          userId: "",
          name: form.name,
          email: form.email.toLowerCase(),
          role: form.role,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (data.temporaryPassword) setPassword(data.temporaryPassword);
      setForm({ name: "", email: "", role: "secretaria" });
      setNotice("Acesso criado.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(membershipId: string, role: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, role }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível alterar o perfil.");
        return;
      }
      commit(
        items.map((item) => (item.id === membershipId ? { ...item, role } : item)),
      );
      setNotice("Perfil atualizado.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(membershipId: string) {
    if (!window.confirm("Remover o acesso deste usuário à escola?")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/schools/${schoolId}/members?membershipId=${membershipId}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível remover o acesso.");
        return;
      }
      commit(items.filter((item) => item.id !== membershipId));
      setNotice("Acesso removido.");
      router.refresh();
    } catch {
      setError("Não foi possível Conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">Equipe e permissões</h2>
      <p className="mt-1 text-sm text-slate-500">
        Gerencie os perfis de acesso de cada usuário nesta escola.
      </p>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}
      {password && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">Senha provisória</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <code className="break-all font-mono text-xs text-slate-900">{password}</code>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"
              onClick={() => navigator.clipboard.writeText(password).catch(() => {})}
            >
              <Clipboard className="size-3.5" /> Copiar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={addMember} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Nome</span>
          <input
            value={form.name}
            onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
            className={inputClass}
            placeholder="Nome completo"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))}
            className={inputClass}
            placeholder="usuario@escola.com.br"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Perfil</span>
          <select
            value={form.role}
            onChange={(event) => setForm((c) => ({ ...c, role: event.target.value }))}
            className={inputClass}
          >
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Adicionar
        </button>
      </form>

      <div className="mt-5 space-y-2">
        {items.map((member) => (
          <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{member.name}</p>
              <p className="text-xs text-slate-500">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {member.role === "owner" ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Criador</span>
              ) : (
                <>
                  <select
                    value={member.role}
                    onChange={(event) => changeRole(member.id, event.target.value)}
                    disabled={saving}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                  >
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    disabled={saving}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:text-red-600"
                    aria-label={`Remover ${member.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
