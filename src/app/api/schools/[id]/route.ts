import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { schools } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { updateSchoolProfileSchema } from "@/lib/schools/management-validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "school:read");
  if (access.error) return access.error;

  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, id))
    .limit(1);

  if (!school) {
    return Response.json({ error: "Escola não encontrada." }, { status: 404 });
  }

  return Response.json({ school });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "school:update");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = updateSchoolProfileSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;

  await db
    .update(schools)
    .set({
      directorName: data.directorName,
      directorEmail: data.directorEmail || null,
      directorPhone: data.directorPhone || null,
      pedagogicalCoordinator: data.pedagogicalCoordinator || null,
      secretaryName: data.secretaryName || null,
      shifts: data.shifts,
      classrooms: data.classrooms ? Number(data.classrooms) : null,
      facilities: data.facilities,
      passingGrade: data.passingGrade,
      bimesters: data.bimesters,
      minFrequency: data.minFrequency,
      rotationModel: data.rotationModel,
      enabledModules: data.enabledModules,
      updatedAt: new Date(),
    })
    .where(eq(schools.id, id));

  return Response.json({ ok: true });
}
