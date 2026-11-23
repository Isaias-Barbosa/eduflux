import { and, count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, physicalRooms } from "@/lib/db/schema";
import { authorizeSchoolRequest, invalidPayload } from "@/lib/schools/api-access";
import { logAudit } from "@/lib/schools/audit";
import { updatePhysicalRoomSchema } from "@/lib/schools/management-validation";

type Context = {
  params: Promise<{ id: string; roomId: string }>;
};

async function findRoom(schoolId: string, roomId: string) {
  const [row] = await db
    .select()
    .from(physicalRooms)
    .where(and(eq(physicalRooms.id, roomId), eq(physicalRooms.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function PATCH(request: Request, { params }: Context) {
  const { id, roomId } = await params;
  const access = await authorizeSchoolRequest(id, "room:manage");
  if (access.error) return access.error;

  const room = await findRoom(id, roomId);
  if (!room) {
    return Response.json({ error: "Sala física não encontrada." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updatePhysicalRoomSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = Object.values(issues.fieldErrors).flat()[0];
    return invalidPayload(firstIssue);
  }

  const data = parsed.data;
  const name = data.name?.trim() ?? room.name;
  const capacity = data.capacity ?? room.capacity;
  const squareMeters =
    data.squareMeters === undefined ? room.squareMeters : data.squareMeters;

  const linked = await db
    .select({ id: classrooms.id, capacity: classrooms.capacity })
    .from(classrooms)
    .where(eq(classrooms.physicalRoomId, roomId));
  const tooSmall = linked.find((classroom) => classroom.capacity > capacity);
  if (tooSmall) {
    return invalidPayload(
      "A capacidade não pode ser menor que as vagas das turmas vinculadas.",
    );
  }

  if (name.toLowerCase() !== room.name.toLowerCase()) {
    const existing = await db
      .select({ id: physicalRooms.id })
      .from(physicalRooms)
      .where(and(eq(physicalRooms.schoolId, id), eq(physicalRooms.name, name)))
      .limit(1);
    if (existing.length > 0 && existing[0].id !== roomId) {
      return Response.json(
        { error: "Já existe uma sala física com este nome." },
        { status: 409 },
      );
    }
  }

  await db
    .update(physicalRooms)
    .set({ name, capacity, squareMeters })
    .where(eq(physicalRooms.id, roomId));

  await logAudit({
    schoolId: id,
    actorUserId: access.session.user.id,
    actorName: access.session.user.name,
    actorRole: access.role ?? "desconhecido",
    action: "room.update",
    entityType: "physical_room",
    entityId: roomId,
    summary: `Atualizou a sala física ${name} (${capacity} cadeiras).`,
  });

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id, roomId } = await params;
  const access = await authorizeSchoolRequest(id, "room:manage");
  if (access.error) return access.error;

  const room = await findRoom(id, roomId);
  if (!room) {
    return Response.json({ error: "Sala física não encontrada." }, { status: 404 });
  }

  const [linked] = await db
    .select({ total: count() })
    .from(classrooms)
    .where(eq(classrooms.physicalRoomId, roomId));
  if (Number(linked.total) > 0) {
    return Response.json(
      { error: "Desvincule as turmas desta sala física antes de excluí-la." },
      { status: 409 },
    );
  }

  await db.delete(physicalRooms).where(eq(physicalRooms.id, roomId));
  await logAudit({
    schoolId: id,
    actorUserId: access.session.user.id,
    actorName: access.session.user.name,
    actorRole: access.role ?? "desconhecido",
    action: "room.delete",
    entityType: "physical_room",
    entityId: roomId,
    summary: `Excluiu a sala física ${room.name}.`,
  });
  return Response.json({ ok: true });
}
