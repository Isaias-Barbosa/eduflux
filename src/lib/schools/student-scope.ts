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

function normalizeDiscipline(discipline: string) {
  return discipline.trim().toLocaleLowerCase("pt-BR");
}

export function isDisciplineAllowed(discipline: string, allowed: string[]) {
  const target = normalizeDiscipline(discipline);
  return allowed.some((item) => normalizeDiscipline(item) === target);
}

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

/**
 * Disciplinas que o professor leciona para um aluno específico.
 * Um professor pode ter várias salas/disciplinas, mas só deve lançar nota,
 * frequência e ocorrências das disciplinas às quais está vinculado.
 */
export async function getTeacherDisciplinesForStudent(
  userId: string,
  schoolId: string,
  studentId: string,
): Promise<string[]> {
  const teacher = await findTeacher(userId, schoolId);
  if (!teacher) return [];

  const assignmentRows = await db
    .select({
      id: teacherAssignments.id,
      discipline: teacherAssignments.discipline,
    })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.teacherId, teacher.id));

  if (assignmentRows.length === 0) {
    // Professores anteriores aos vínculos múltiplos usam apenas a sala legada.
    const [student] = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .limit(1);

    if (!student || !teacher.classroomId || teacher.classroomId !== student.classroomId) {
      return [];
    }
    return teacher.discipline ? [teacher.discipline] : [];
  }

  const links = await db
    .select({ assignmentId: teacherStudents.assignmentId })
    .from(teacherStudents)
    .where(
      and(
        inArray(
          teacherStudents.assignmentId,
          assignmentRows.map((row) => row.id),
        ),
        eq(teacherStudents.studentId, studentId),
      ),
    );

  const linkedIds = new Set(links.map((link) => link.assignmentId));
  return assignmentRows
    .filter((row) => linkedIds.has(row.id) && row.discipline.trim())
    .map((row) => row.discipline);
}

export async function canTeacherManageDiscipline(
  userId: string,
  schoolId: string,
  studentId: string,
  discipline: string,
): Promise<boolean> {
  const allowed = await getTeacherDisciplinesForStudent(userId, schoolId, studentId);
  return isDisciplineAllowed(discipline, allowed);
}
