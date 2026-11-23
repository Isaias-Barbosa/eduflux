import { and, asc, count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, physicalRooms } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { logAudit } from "@/lib/schools/audit";
import { createPhysicalRoomSchema } from "@/lib/schools/management-validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "school:read");
  if (access.error) return access.error;

  const rows = await db
    .select({
      id: physicalRooms.id,
      name: physicalRooms.name,
      squareMeters: physicalRooms.squareMeters,
      capacity: physicalRooms.capacity,
      classroomCount: count(classrooms.id),
    })
    .from(physicalRooms)
    .leftJoin(classrooms, eq(classrooms.physicalRoomId, physicalRooms.id))
    .where(eq(physicalRooms.schoolId, id))
    .groupBy(physicalRooms.id)
    .orderBy(asc(physicalRooms.name));

  return Response.json({
    physicalRooms: rows.map((row) => ({ ...row, classroomCount: Number(row.classroomCount) })),
  });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "room:manage");
  if (access.error) return access.error;

  const payload = await request.json().catch(() => null);
  const parsed = createPhysicalRoomSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const name = parsed.data.name.trim();
  const existing = await db
    .select({ id: physicalRooms.id })
    .from(physicalRooms)
    .where(and(eq(physicalRooms.schoolId, id), eq(physicalRooms.name, name)))
    .limit(1);
  if (existing.length > 0) {
    return Response.json(
      { error: "Já existe uma sala física com este nome." },
      { status: 409 },
    );
  }

  const roomId = crypto.randomUUID();
  await db.insert(physicalRooms).values({
    id: roomId,
    schoolId: id,
    name,
    squareMeters: parsed.data.squareMeters,
    capacity: parsed.data.capacity,
  });

  await logAudit({
    schoolId: id,
    actorUserId: access.session.user.id,
    actorName: access.session.user.name,
    actorRole: access.role ?? "desconhecido",
    action: "room.create",
    entityType: "physical_room",
    entityId: roomId,
    summary: `Cadastrou a sala física ${name} (${parsed.data.capacity} cadeiras).`,
  });

  return Response.json({ id: roomId, name }, { status: 201 });
}
