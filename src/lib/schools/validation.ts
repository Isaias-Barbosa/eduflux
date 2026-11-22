import { z } from "zod";

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
  cnpj: z
    .string()
    .trim()
    .regex(/^(\d{14})?$/, "CNPJ deve conter 14 dígitos")
    .default(""),
  phone: z.string().trim().max(20, "Telefone muito longo").default(""),
  email: optionalEmail,
  zipCode: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "CEP deve conter 8 dígitos"),
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
  directorName: requiredText("Nome da direção"),
  directorEmail: optionalEmail,
  directorPhone: z.string().trim().max(20, "Telefone muito longo").default(""),
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
