import { randomBytes } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { schoolMembers } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import {
  addMemberSchema,
  updateMemberSchema,
} from "@/lib/schools/management-validation";
import { createManagedUser, findUserByEmail } from "@/lib/schools/managed-users";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "member:read");
  if (access.error) return access.error;

  const rows = await db
    .select({
      id: schoolMembers.id,
      role: schoolMembers.role,
      createdAt: schoolMembers.createdAt,
      userId: schoolMembers.userId,
      name: user.name,
      email: user.email,
    })
    .from(schoolMembers)
    .innerJoin(user, eq(schoolMembers.userId, user.id))
    .where(eq(schoolMembers.schoolId, id))
    .orderBy(asc(user.name));

  return Response.json({ members: rows });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "member:manage");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existingMembership = await db
    .select({ id: schoolMembers.id })
    .from(schoolMembers)
    .innerJoin(user, eq(schoolMembers.userId, user.id))
    .where(and(eq(schoolMembers.schoolId, id), eq(user.email, email)))
    .limit(1);

  if (existingMembership.length > 0) {
    return Response.json(
      { error: "Este usuário já possui acesso a esta escola." },
      { status: 409 },
    );
  }

  let userId: string;
  let temporaryPassword: string | null = null;
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    userId = existingUser.id;
  } else {
    temporaryPassword =
      data.temporaryPassword || `${randomBytes(6).toString("base64url")}Aa1!`;
    try {
      userId = await createManagedUser({
        name: data.name,
        email,
        password: temporaryPassword,
      });
    } catch {
      return invalidPayload("Não foi possível criar o usuário.");
    }
  }

  const membershipId = crypto.randomUUID();
  await db.insert(schoolMembers).values({
    id: membershipId,
    schoolId: id,
    userId,
    role: data.role,
  });

  return Response.json(
    { id: membershipId, temporaryPassword },
    { status: 201 },
  );
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "member:manage");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = updateMemberSchema.safeParse(payload);

  if (!parsed.success) {
    return invalidPayload("Perfil inválido.");
  }

  const membershipId = String(payload?.membershipId ?? "");
  if (!membershipId) return invalidPayload("Informe o vínculo.");

  const [membership] = await db
    .select()
    .from(schoolMembers)
    .where(and(eq(schoolMembers.id, membershipId), eq(schoolMembers.schoolId, id)))
    .limit(1);

  if (!membership) {
    return Response.json({ error: "Vínculo não encontrado." }, { status: 404 });
  }

  await db
    .update(schoolMembers)
    .set({ role: parsed.data.role })
    .where(eq(schoolMembers.id, membershipId));

  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "member:manage");
  if (access.error) return access.error;

  const membershipId = new URL(request.url).searchParams.get("membershipId") ?? "";
  if (!membershipId) return invalidPayload("Informe o vínculo.");

  const [membership] = await db
    .select()
    .from(schoolMembers)
    .where(and(eq(schoolMembers.id, membershipId), eq(schoolMembers.schoolId, id)))
    .limit(1);

  if (!membership) {
    return Response.json({ error: "Vínculo não encontrado." }, { status: 404 });
  }

  if (
    membership.role === "owner" ||
    membership.userId === access.session.user.id
  ) {
    return invalidPayload("Este vínculo não pode ser removido.");
  }

  await db.delete(schoolMembers).where(eq(schoolMembers.id, membershipId));

  return Response.json({ ok: true });
}
