export const SHIFT_OPTIONS = ["Matutino", "Vespertino", "Noturno"] as const;
export type ShiftOption = (typeof SHIFT_OPTIONS)[number];

/** Valores usados antes da padronização dos turnos. */
const LEGACY_SHIFTS: Record<string, ShiftOption> = {
  Manhã: "Matutino",
  Tarde: "Vespertino",
  Noite: "Noturno",
};

export function normalizeShift(value: string | null | undefined): ShiftOption | null {
  if (!value) return null;
  const trimmed = value.trim();
  if ((SHIFT_OPTIONS as readonly string[]).includes(trimmed)) {
    return trimmed as ShiftOption;
  }
  return LEGACY_SHIFTS[trimmed] ?? null;
}

export const FACILITY_OPTIONS = [
  "Biblioteca",
  "Laboratório de informática",
  "Quadra esportiva",
  "Refeitório",
  "Salão de eventos",
  "Acessibilidade",
] as const;
export type FacilityOption = (typeof FACILITY_OPTIONS)[number];
