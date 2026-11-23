import { z } from "zod";

import { onlyDigits } from "./cep";

const requiredText = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`)
    .max(max, `${label} é muito longo`);

const optionalText = (max = 255) =>
  z.string().trim().max(max, "Texto muito longo").default("");

const optionalEmail = z
  .union([z.literal(""), z.string().trim().email("E-mail inválido")])
  .default("");

export const createSchoolSchema = z.object({
  segment: z.enum(["infantil", "fundamental", "medio"], {
    error: "Selecione o tipo de ensino",
  }),
  name: requiredText("Nome da escola"),
  legalName: optionalText(160),
  cnpj: z
    .string()
    .trim()
    .transform(onlyDigits)
    .pipe(z.string().regex(/^(\d{14})?$/, "CNPJ deve conter 14 dígitos"))
    .default(""),
  inepCode: z
    .string()
    .trim()
    .transform(onlyDigits)
    .pipe(z.string().regex(/^(\d{8})?$/, "Código INEP deve conter 8 dígitos"))
    .default(""),
  foundedYear: z
    .string()
    .trim()
    .regex(/^(\d{4})?$/, "Ano de fundação deve ter 4 dígitos")
    .refine(
      (value) =>
        !value ||
        (Number(value) >= 1800 && Number(value) <= new Date().getFullYear()),
      "Ano de fundação inválido",
    )
    .default(""),
  phone: z.string().trim().max(20, "Telefone muito longo").default(""),
  email: optionalEmail,
  zipCode: z
    .string()
    .trim()
    .transform(onlyDigits)
    .pipe(z.string().regex(/^\d{8}$/, "CEP deve conter 8 dígitos")),
  street: requiredText("Rua ou avenida"),
  number: requiredText("Número", 20),
  complement: optionalText(80),
  neighborhood: requiredText("Bairro", 80),
  city: requiredText("Cidade", 80),
  state: z
    .string()
    .trim()
    .length(2, "Informe a sigla do estado (UF)")
    .transform((value) => value.toUpperCase()),
  adminName: requiredText("Nome do administrador", 120),
  adminEmail: z.string().trim().email("E-mail do administrador inválido"),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "escola";
}
