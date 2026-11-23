export type CepAddress = {
  cep: string;
  street: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function lookupCep(rawCep: string): Promise<CepAddress | null> {
  const cep = onlyDigits(rawCep);
  if (!/^\d{8}$/.test(cep)) return null;

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error("Falha ao consultar o CEP");
  }

  const data = (await response.json()) as {
    cep?: string;
    logradouro?: string;
    complemento?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean;
  };

  if (data.erro || !data.localidade) return null;

  return {
    cep: onlyDigits(data.cep ?? cep),
    street: data.logradouro ?? "",
    complement: data.complemento ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade,
    state: data.uf ?? "",
  };
}
