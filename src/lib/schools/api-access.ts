import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { canManageSchool } from "./access";

export async function authorizeSchoolRequest(schoolId: string) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return {
      error: Response.json(
        { error: "Sua sessão expirou. Entre novamente." },
        { status: 401 },
      ),
    };
  }

  if (!(await canManageSchool(session.user.id, schoolId))) {
    return {
      error: Response.json(
        { error: "Você não tem acesso a esta escola." },
        { status: 403 },
      ),
    };
  }

  return { session };
}

export function invalidPayload(error?: string) {
  return Response.json(
    { error: error ?? "Confira os dados informados." },
    { status: 400 },
  );
}
