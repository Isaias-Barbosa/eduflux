import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { validatePhysicalRoomCapacity } from "@/lib/schools/classroom-capacity";
import { generateClassroomsSchema } from "@/lib/schools/management-validation";

type Context = { params: Promise<{ id: string }> };

function letterFor(index: number): string {
  let value = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return label;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "classroom:create");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = generateClassroomsSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;
  const grade = data.grade.trim();
  const physicalRoomId = data.physicalRoomId || null;

  const capacityError = await validatePhysicalRoomCapacity(
    id,
    physicalRoomId,
    data.capacity,
  );
  if (capacityError) return invalidPayload(capacityError);

  const names = Array.from(
    { length: data.quantity },
    (_, index) => `${grade} ${letterFor(index)}`,
  );

  const existing = await db
    .select({ name: classrooms.name })
    .from(classrooms)
    .where(
      and(eq(classrooms.schoolId, id), eq(classrooms.schoolYear, data.schoolYear)),
    );

  const existingNames = new Set(existing.map((row) => row.name.trim().toLowerCase()));
  const conflicting = names.find((name) => existingNames.has(name.toLowerCase()));
  if (conflicting) {
    return Response.json(
      { error: `A turma ${conflicting} já existe no ano letivo informado.` },
      { status: 409 },
    );
  }

  const created = await db.transaction(async (tx) => {
    const rows: Array<{ id: string; name: string }> = [];
    for (const name of names) {
      const classroomId = crypto.randomUUID();
      await tx.insert(classrooms).values({
        id: classroomId,
        schoolId: id,
        name,
        grade,
        shift: data.shift,
        schoolYear: data.schoolYear,
        capacity: data.capacity,
        physicalRoomId,
      });
      rows.push({ id: classroomId, name });
    }
    return rows;
  });

  return Response.json({ created }, { status: 201 });
}
