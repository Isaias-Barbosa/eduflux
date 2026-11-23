import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { isPlatformCreator } from "./creator";
import { getSchoolRole } from "./permissions";

export { isPlatformCreator } from "./creator";

export async function canAccessSchool(
  userId: string,
  schoolId: string,
): Promise<boolean> {
  return (await getSchoolRole(userId, schoolId)) !== null;
}

/** Mantido para compatibilidade com as rotas que ainda verificam gestão ampla. */
export async function canManageSchool(
  userId: string,
  schoolId: string,
): Promise<boolean> {
  if (await isPlatformCreator(userId)) return true;
  const role = await getSchoolRole(userId, schoolId);
  return role === "admin" || role === "owner";
}

export async function requireCreator() {
  const session = await requireUser();

  if (!(await isPlatformCreator(session.user.id))) {
    redirect("/dashboard");
  }

  return session;
}
