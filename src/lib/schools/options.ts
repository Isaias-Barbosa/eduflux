export const SHIFT_OPTIONS = ["Manhã", "Tarde", "Noite"] as const;
export type ShiftOption = (typeof SHIFT_OPTIONS)[number];

export const FACILITY_OPTIONS = [
  "Biblioteca",
  "Laboratório de informática",
  "Quadra esportiva",
  "Refeitório",
  "Salão de eventos",
  "Acessibilidade",
] as const;
export type FacilityOption = (typeof FACILITY_OPTIONS)[number];
