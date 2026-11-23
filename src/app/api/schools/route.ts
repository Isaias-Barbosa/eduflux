import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { schools, schoolMembers } from "@/lib/db/schema";
import { isPlatformCreator } from "@/lib/schools/access";
import { createManagedUser, findUserByEmail } from "@/lib/schools/managed-users";
import { createSchoolSchema, slugify } from "@/lib/schools/validation";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json(
      { error: "Sua sessão expirou. Entre novamente." },
      { status: 401 },
    );
  }

  if (!(await isPlatformCreator(session.user.id))) {
    return Response.json(
      { error: "Somente o criador da plataforma pode cadastrar escolas." },
      { status: 403 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = createSchoolSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];

    return Response.json(
      {
        error: firstIssue ?? "Confira os dados informados.",
        issues,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const adminEmail = data.adminEmail.toLowerCase();

  const existingAdmin = await findUserByEmail(adminEmail);

  if (existingAdmin) {
    return Response.json(
      { error: "Já existe um usuário com o e-mail do administrador." },
      { status: 409 },
    );
  }

  const temporaryPassword = `${randomBytes(6).toString("base64url")}Aa1!`;

  let adminUserId: string;
  try {
    adminUserId = await createManagedUser({
      name: data.adminName,
      email: adminEmail,
      password: temporaryPassword,
    });
  } catch {
    return Response.json(
      { error: "Não foi possível criar o usuário administrador." },
      { status: 400 },
    );
  }

  const baseSlug = slugify(data.name);
  let slug = baseSlug;

  const sameSlug = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.slug, slug))
    .limit(1);

  if (sameSlug.length > 0) {
    slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
  }

  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(schools).values({
      id,
      ownerId: session.user.id,
      name: data.name,
      legalName: data.legalName || null,
      slug,
      segment: data.segment,
      cnpj: data.cnpj || null,
      inepCode: data.inepCode || null,
      foundedYear: data.foundedYear ? Number(data.foundedYear) : null,
      phone: data.phone || null,
      email: data.email || null,
      zipCode: data.zipCode,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      // Preenchido pelo administrador da escola no gerenciamento.
      directorName: "",
    });

    await tx.insert(schoolMembers).values([
      {
        id: crypto.randomUUID(),
        schoolId: id,
        userId: session.user.id,
        role: "owner",
      },
      {
        id: crypto.randomUUID(),
        schoolId: id,
        userId: adminUserId,
        role: "admin",
      },
    ]);
  });

  return Response.json(
    { id, slug, adminEmail, temporaryPassword },
    { status: 201 },
  );
}
