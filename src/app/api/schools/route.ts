import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { schools, schoolMembers } from "@/lib/db/schema";
import { createSchoolSchema, slugify } from "@/lib/schools/validation";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json(
      { error: "Sua sessão expirou. Entre novamente." },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = createSchoolSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: "Confira os dados informados.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
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
      slug,
      segment: data.segment,
      cnpj: data.cnpj || null,
      phone: data.phone || null,
      email: data.email || null,
      zipCode: data.zipCode,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      directorName: data.directorName,
      directorEmail: data.directorEmail || null,
      directorPhone: data.directorPhone || null,
    });

    await tx.insert(schoolMembers).values({
      id: crypto.randomUUID(),
      schoolId: id,
      userId: session.user.id,
      role: "admin",
    });
  });

  return Response.json({ id, slug }, { status: 201 });
}
