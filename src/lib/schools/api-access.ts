import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getSchoolRole, hasPermission, type Permission } from "./permissions";

export async function authorizeSchoolRequest(
  schoolId: string,
  permission: Permission,
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return {
      error: Response.json(
        { error: "Sua sessão expirou. Entre novamente." },
        { status: 401 },
      ),
    };
  }

  if (!(await hasPermission(session.user.id, schoolId, permission))) {
    return {
      error: Response.json(
        { error: "Você não tem permissão para esta operação." },
        { status: 403 },
      ),
    };
  }

  const role = await getSchoolRole(session.user.id, schoolId);

  return { session, role };
}

export function invalidPayload(error?: string) {
  return Response.json(
    { error: error ?? "Confira os dados informados." },
    { status: 400 },
  );
}
