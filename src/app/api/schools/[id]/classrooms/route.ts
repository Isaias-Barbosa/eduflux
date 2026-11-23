import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { createClassroomSchema } from "@/lib/schools/management-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "classroom:create");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = createClassroomSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const name = parsed.data.name.trim();

  const existing = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.schoolId, id), eq(classrooms.name, name)))
    .limit(1);

  if (existing.length > 0) {
    return invalidPayload("Já existe uma sala com esse nome.");
  }

  const classroomId = crypto.randomUUID();

  await db.insert(classrooms).values({
    id: classroomId,
    schoolId: id,
    name,
    shift: parsed.data.shift || null,
  });

  return Response.json({ id: classroomId, name, shift: parsed.data.shift }, { status: 201 });
}
