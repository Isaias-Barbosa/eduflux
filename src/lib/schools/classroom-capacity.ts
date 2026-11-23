import { and, asc, count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  classroomWaitlist,
  classrooms,
  physicalRooms,
  students,
} from "@/lib/db/schema";
import { normalizeShift, type ShiftOption } from "./options";

export type ClassroomSuggestion = {
  id: string;
  name: string;
  grade: string | null;
  shift: string | null;
  capacity: number;
  occupied: number;
  seatsLeft: number;
  physicalRoomName: string | null;
};

type ClassroomRow = {
  id: string;
  name: string;
  grade: string | null;
  shift: string | null;
  capacity: number;
  status: "aberta" | "fechada";
  physicalRoomName: string | null;
  physicalRoomCapacity: number | null;
};

export async function classroomOccupancyMap(
  schoolId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ classroomId: students.classroomId, total: count() })
    .from(students)
    .where(and(eq(students.schoolId, schoolId), eq(students.status, "ativo")))
    .groupBy(students.classroomId);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.classroomId) map.set(row.classroomId, Number(row.total));
  }
  return map;
}

export async function findClassroom(
  schoolId: string,
  classroomId: string,
): Promise<ClassroomRow | null> {
  const [row] = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      grade: classrooms.grade,
      shift: classrooms.shift,
      capacity: classrooms.capacity,
      status: classrooms.status,
      physicalRoomName: physicalRooms.name,
      physicalRoomCapacity: physicalRooms.capacity,
    })
    .from(classrooms)
    .leftJoin(physicalRooms, eq(classrooms.physicalRoomId, physicalRooms.id))
    .where(and(eq(classrooms.id, classroomId), eq(classrooms.schoolId, schoolId)))
    .limit(1);

  return row ?? null;
}

/** `vagas_ofertadas` não pode ultrapassar a capacidade da sala física. */
export async function validatePhysicalRoomCapacity(
  schoolId: string,
  physicalRoomId: string | null,
  capacity: number,
): Promise<string | null> {
  if (!physicalRoomId) return null;

  const [room] = await db
    .select({ name: physicalRooms.name, capacity: physicalRooms.capacity })
    .from(physicalRooms)
    .where(
      and(eq(physicalRooms.id, physicalRoomId), eq(physicalRooms.schoolId, schoolId)),
    )
    .limit(1);

  if (!room) return "Sala física inválida para esta escola.";
  if (capacity > room.capacity) {
    return `A sala física ${room.name} comporta até ${room.capacity} alunos.`;
  }
  return null;
}

export async function validateClassroomEnrollment(
  schoolId: string,
  classroomId: string,
  excludeStudentId?: string,
): Promise<string | null> {
  const classroom = await findClassroom(schoolId, classroomId);
  if (!classroom) return "Turma inválida para esta escola.";
  if (classroom.status === "fechada") {
    return `A turma ${classroom.name} está fechada.`;
  }

  const occupancy = await classroomOccupancyMap(schoolId);
  let occupied = occupancy.get(classroomId) ?? 0;

  if (excludeStudentId) {
    const [student] = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(and(eq(students.id, excludeStudentId), eq(students.schoolId, schoolId)))
      .limit(1);
    if (student?.classroomId === classroomId) occupied -= 1;
  }

  if (occupied >= classroom.capacity) {
    return `A turma ${classroom.name} atingiu o limite de ${classroom.capacity} alunos.`;
  }
  return null;
}

/** Sugere turmas abertas com vagas para enturmação assistida. */
export async function suggestClassrooms(
  schoolId: string,
  filters: { grade?: string | null; shift?: string | null } = {},
): Promise<ClassroomSuggestion[]> {
  const occupancy = await classroomOccupancyMap(schoolId);
  const rows = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      grade: classrooms.grade,
      shift: classrooms.shift,
      capacity: classrooms.capacity,
      status: classrooms.status,
      physicalRoomName: physicalRooms.name,
    })
    .from(classrooms)
    .leftJoin(physicalRooms, eq(classrooms.physicalRoomId, physicalRooms.id))
    .where(eq(classrooms.schoolId, schoolId))
    .orderBy(asc(classrooms.grade), asc(classrooms.name));

  const wantedShift: ShiftOption | null = normalizeShift(filters.shift);
  const wantedGrade = filters.grade?.trim().toLowerCase() || null;

  return rows
    .filter((row) => row.status === "aberta")
    .filter((row) => !wantedGrade || row.grade?.trim().toLowerCase() === wantedGrade)
    .filter((row) => !wantedShift || normalizeShift(row.shift) === wantedShift)
    .map((row) => {
      const occupied = occupancy.get(row.id) ?? 0;
      return {
        id: row.id,
        name: row.name,
        grade: row.grade,
        shift: row.shift,
        capacity: row.capacity,
        occupied,
        seatsLeft: Math.max(0, row.capacity - occupied),
        physicalRoomName: row.physicalRoomName,
      };
    })
    .filter((row) => row.seatsLeft > 0);
}

export async function registerWaitlistEntry(input: {
  schoolId: string;
  studentId: string;
  classroomId: string | null;
  discipline: string;
  note?: string | null;
  schoolYear?: number;
}): Promise<{ created: boolean; id: string | null }> {
  const schoolYear = input.schoolYear ?? new Date().getFullYear();
  const existing = await db
    .select({ id: classroomWaitlist.id })
    .from(classroomWaitlist)
    .where(
      and(
        eq(classroomWaitlist.schoolId, input.schoolId),
        eq(classroomWaitlist.studentId, input.studentId),
        eq(classroomWaitlist.discipline, input.discipline.trim()),
        eq(classroomWaitlist.schoolYear, schoolYear),
        eq(classroomWaitlist.status, "aguardando"),
      ),
    )
    .limit(1);

  if (existing.length > 0) return { created: false, id: existing[0].id };

  const id = crypto.randomUUID();
  await db.insert(classroomWaitlist).values({
    id,
    schoolId: input.schoolId,
    studentId: input.studentId,
    classroomId: input.classroomId || null,
    discipline: input.discipline.trim(),
    note: input.note ?? null,
    schoolYear,
  });
  return { created: true, id };
}
