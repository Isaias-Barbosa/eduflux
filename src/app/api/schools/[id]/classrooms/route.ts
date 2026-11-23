import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, physicalRooms } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { logAudit } from "@/lib/schools/audit";
import {
  classroomOccupancyMap,
  validatePhysicalRoomCapacity,
} from "@/lib/schools/classroom-capacity";
import { createClassroomSchema } from "@/lib/schools/management-validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "school:read");
  if (access.error) return access.error;

  const occupancy = await classroomOccupancyMap(id);
  const rows = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      grade: classrooms.grade,
      shift: classrooms.shift,
      schoolYear: classrooms.schoolYear,
      capacity: classrooms.capacity,
      status: classrooms.status,
      physicalRoomId: classrooms.physicalRoomId,
      physicalRoomName: physicalRooms.name,
      physicalRoomCapacity: physicalRooms.capacity,
    })
    .from(classrooms)
    .leftJoin(physicalRooms, eq(classrooms.physicalRoomId, physicalRooms.id))
    .where(eq(classrooms.schoolId, id))
    .orderBy(asc(classrooms.schoolYear), asc(classrooms.name));

  return Response.json({
    classrooms: rows.map((row) => ({
      ...row,
      occupied: occupancy.get(row.id) ?? 0,
      seatsLeft: Math.max(0, row.capacity - (occupancy.get(row.id) ?? 0)),
    })),
  });
}

export async function POST(request: Request, { params }: Context) {
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

  const data = parsed.data;
  const name = data.name.trim();
  const physicalRoomId = data.physicalRoomId || null;

  const capacityError = await validatePhysicalRoomCapacity(
    id,
    physicalRoomId,
    data.capacity,
  );
  if (capacityError) return invalidPayload(capacityError);

  const existing = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.schoolId, id),
        eq(classrooms.schoolYear, data.schoolYear),
        eq(classrooms.name, name),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return Response.json(
      { error: "Já existe uma turma com este nome no ano letivo informado." },
      { status: 409 },
    );
  }

  const classroomId = crypto.randomUUID();
  await db.insert(classrooms).values({
    id: classroomId,
    schoolId: id,
    name,
    grade: data.grade.trim(),
    shift: data.shift,
    schoolYear: data.schoolYear,
    capacity: data.capacity,
    physicalRoomId,
  });

  await logAudit({
    schoolId: id,
    actorUserId: access.session.user.id,
    actorName: access.session.user.name,
    actorRole: access.role ?? "desconhecido",
    action: "classroom.create",
    entityType: "classroom",
    entityId: classroomId,
    summary: `Criou a turma ${name} (${data.grade}, ${data.shift}, ${data.schoolYear}, ${data.capacity} vagas).`,
  });

  return Response.json({ id: classroomId, name }, { status: 201 });
}
