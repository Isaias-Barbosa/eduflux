import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  classrooms,
  students,
  teacherAssignments,
  teacherStudents,
  teachers,
} from "@/lib/db/schema";
import type { SchoolRole } from "./permissions";

type ScopedStudent = {
  id: string;
  classroomId: string | null;
  guardianUserId: string | null;
};

export type TeacherAssignmentContext = {
  id: string;
  classroomId: string;
  classroomName: string;
  discipline: string;
  studentIds: string[];
};

export type TeacherContext = {
  teacherId: string;
  name: string;
  assignments: TeacherAssignmentContext[];
  /** Verdadeiro quando o professor ainda usa apenas o vínculo antigo de sala. */
  legacy: boolean;
};

async function findTeacher(userId: string, schoolId: string) {
  const [teacher] = await db
    .select()
    .from(teachers)
    .where(and(eq(teachers.schoolId, schoolId), eq(teachers.userId, userId)))
    .limit(1);

  return teacher ?? null;
}

/** Professores veem os alunos dos próprios vínculos; responsáveis, os seus. */
export async function canAccessStudent(
  userId: string,
  schoolId: string,
  student: ScopedStudent,
  role: SchoolRole | null,
): Promise<boolean> {
  if (role === "responsavel") {
    return student.guardianUserId === userId;
  }

  if (role === "professor") {
    const teacher = await findTeacher(userId, schoolId);
    if (!teacher) return false;

    const assignmentRows = await db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(eq(teacherAssignments.teacherId, teacher.id));

    if (assignmentRows.length > 0) {
      const links = await db
        .select({ studentId: teacherStudents.studentId })
        .from(teacherStudents)
        .where(
          inArray(
            teacherStudents.assignmentId,
            assignmentRows.map((row) => row.id),
          ),
        );

      return links.some((link) => link.studentId === student.id);
    }

    // Compatibilidade com professores criados antes dos vínculos múltiplos.
    return Boolean(
      teacher.classroomId && teacher.classroomId === student.classroomId,
    );
  }

  return true;
}

/**
 * Retorna as salas/disciplinas do professor e os alunos de cada vínculo.
 * Quando ainda não há vínculos, deriva um vínculo da sala legada.
 */
export async function getTeacherContext(
  userId: string,
  schoolId: string,
): Promise<TeacherContext | null> {
  const teacher = await findTeacher(userId, schoolId);
  if (!teacher) return null;

  const assignmentRows = await db
    .select({
      id: teacherAssignments.id,
      classroomId: teacherAssignments.classroomId,
      classroomName: classrooms.name,
      discipline: teacherAssignments.discipline,
    })
    .from(teacherAssignments)
    .innerJoin(classrooms, eq(teacherAssignments.classroomId, classrooms.id))
    .where(eq(teacherAssignments.teacherId, teacher.id))
    .orderBy(asc(classrooms.name), asc(teacherAssignments.discipline));

  if (assignmentRows.length === 0 && teacher.classroomId) {
    const [classroom] = await db
      .select({ name: classrooms.name })
      .from(classrooms)
      .where(eq(classrooms.id, teacher.classroomId))
      .limit(1);

    const legacyStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.schoolId, schoolId),
          eq(students.classroomId, teacher.classroomId),
        ),
      );

    return {
      teacherId: teacher.id,
      name: teacher.name,
      legacy: true,
      assignments: [
        {
          id: "legacy",
          classroomId: teacher.classroomId,
          classroomName: classroom?.name ?? "Sala vinculada",
          discipline: teacher.discipline,
          studentIds: legacyStudents.map((row) => row.id),
        },
      ],
    };
  }

  const assignmentIds = assignmentRows.map((row) => row.id);
  const studentLinks =
    assignmentIds.length > 0
      ? await db
          .select({
            assignmentId: teacherStudents.assignmentId,
            studentId: teacherStudents.studentId,
          })
          .from(teacherStudents)
          .where(inArray(teacherStudents.assignmentId, assignmentIds))
      : [];

  return {
    teacherId: teacher.id,
    name: teacher.name,
    legacy: false,
    assignments: assignmentRows.map((row) => ({
      ...row,
      studentIds: studentLinks
        .filter((link) => link.assignmentId === row.id)
        .map((link) => link.studentId),
    })),
  };
}
