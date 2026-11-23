import { lookupCep, onlyDigits } from "@/lib/schools/cep";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cep: string }> },
) {
  const { cep } = await params;

  if (!/^\d{8}$/.test(onlyDigits(cep))) {
    return Response.json({ error: "CEP inválido" }, { status: 400 });
  }

  try {
    const address = await lookupCep(cep);

    if (!address) {
      return Response.json({ error: "CEP não encontrado" }, { status: 404 });
    }

    return Response.json(address);
  } catch {
    return Response.json(
      { error: "Não foi possível consultar o CEP agora." },
      { status: 502 },
    );
  }
}
