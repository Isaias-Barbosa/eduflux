import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { classrooms, students } from "@/lib/db/schema";
import { authorizeSchoolRequest } from "@/lib/schools/api-access";

const COLUMNS: Array<[string, string]> = [
  ["Matrícula", "enrollmentNumber"],
  ["Nome completo", "name"],
  ["Data de nascimento", "birthDate"],
  ["CPF", "cpf"],
  ["Sexo", "sex"],
  ["Naturalidade", "birthCity"],
  ["UF naturalidade", "birthState"],
  ["Cor/raça", "raceColor"],
  ["Nome da mãe", "motherName"],
  ["Nome do pai", "fatherName"],
  ["Responsável", "guardianName"],
  ["CPF do responsável", "guardianCpf"],
  ["Telefone de emergência", "emergencyPhone"],
  ["Telefone de emergência 2", "emergencyPhone2"],
  ["CEP", "zipCode"],
  ["Logradouro", "street"],
  ["Número", "number"],
  ["Complemento", "complement"],
  ["Bairro", "neighborhood"],
  ["Cidade", "city"],
  ["UF", "state"],
  ["Ano/série", "grade"],
  ["Turma", "classroomName"],
  ["Turno", "shift"],
  ["Situação", "status"],
  ["Certidão", "birthCertificateStatus"],
  ["Histórico escolar", "schoolHistoryStatus"],
  ["Comprovante de residência", "residenceProofStatus"],
  ["Documentação", "docsStatus"],
];

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  transferido: "Transferido",
  concluido: "Concluído",
  pendente: "Pendente",
  validado: "Validado",
  feminino: "Feminino",
  masculino: "Masculino",
  outro: "Outro",
  nao_informado: "Não informado",
  branca: "Branca",
  preta: "Preta",
  parda: "Parda",
  amarela: "Amarela",
  indigena: "Indígena",
};

function escapeCsv(value: string | null | undefined): string {
  const text = STATUS_LABELS[value ?? ""] ?? value ?? "";
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "student:export");
  if (access.error) return access.error;

  const rows = await db
    .select({ student: students, classroomName: classrooms.name })
    .from(students)
    .leftJoin(classrooms, eq(students.classroomId, classrooms.id))
    .where(eq(students.schoolId, id))
    .orderBy(asc(students.name));

  const lines = [
    COLUMNS.map(([label]) => escapeCsv(label)).join(";"),
    ...rows.map(({ student, classroomName }) =>
      COLUMNS.map(([, key]) =>
        escapeCsv(
          key === "classroomName"
            ? classroomName
            : String(student[key as keyof typeof student] ?? ""),
        ),
      ).join(";"),
    ),
  ];

  const csv = `\uFEFF${lines.join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alunos-escola-${id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
