/**
 * Catálogo de tipos de ensino. Cada segmento habilita um conjunto diferente
 * de módulos no painel da escola. A dependência administrativa (pública/privada)
 * adapta módulos e fluxos operacionais.
 */
export const SEGMENTS = {
  infantil: {
    id: "infantil",
    label: "Jardim de infância",
    shortLabel: "Infantil",
    audience: "Educação infantil · berçário aos 5 anos",
    description:
      "Rotina de cuidado, acompanhamento do desenvolvimento e comunicação com a família.",
  },
  fundamental: {
    id: "fundamental",
    label: "Ensino fundamental",
    shortLabel: "Fundamental",
    audience: "1º ao 9º ano",
    description:
      "Turmas, disciplinas, notas, frequência e boletins do ensino fundamental.",
  },
  medio: {
    id: "medio",
    label: "Ensino médio",
    shortLabel: "Médio",
    audience: "1ª ao 3ª série · preparação para vestibulares",
    description:
      "Gestão acadêmica completa com trilhas, eletivas e preparação para ENEM e vestibulares.",
  },
} as const;

export type SchoolSegment = keyof typeof SEGMENTS;

export const SEGMENT_IDS = Object.keys(SEGMENTS) as SchoolSegment[];

export type AdministrativeDependency = "publica" | "privada";

/** Identificadores estáveis dos módulos habilitáveis por escola. */
export const SCHOOL_MODULE_IDS = [
  "turmas",
  "criancas",
  "diario",
  "desenvolvimento",
  "eventos",
  "comunicados",
  "alunos",
  "disciplinas",
  "notas",
  "frequencia",
  "calendario",
  "preparacao",
  "financeiro",
  "rh",
  "censo_inep",
  "programas_sociais",
] as const;

export type SchoolModuleId = (typeof SCHOOL_MODULE_IDS)[number];

export type SchoolModule = {
  id: SchoolModuleId;
  name: string;
  description: string;
  /** Se definido, o módulo só aparece para essa dependência. */
  dependency?: AdministrativeDependency;
};

const BASE_MODULES: Record<SchoolSegment, SchoolModule[]> = {
  infantil: [
    { id: "turmas", name: "Turmas e faixas etárias", description: "Organize salas por idade e faixa de desenvolvimento." },
    { id: "criancas", name: "Crianças e responsáveis", description: "Cadastros com vínculos familiares e contatos de emergência." },
    { id: "diario", name: "Diário de bordo", description: "Registros diários de atividades, sono e alimentação." },
    { id: "desenvolvimento", name: "Acompanhamento do desenvolvimento", description: "Marcos de aprendizagem e observações da equipe pedagógica." },
    { id: "eventos", name: "Eventos e comemorações", description: "Calendário de festas, passeios e reuniões de família." },
    { id: "comunicados", name: "Comunicados", description: "Avisos e recados enviados aos responsáveis." },
  ],
  fundamental: [
    { id: "turmas", name: "Turmas e séries", description: "Organize classes por ano, turno e série." },
    { id: "alunos", name: "Alunos e responsáveis", description: "Fichas completas, documentos e contatos." },
    { id: "disciplinas", name: "Disciplinas", description: "Componentes curriculares e professores responsáveis." },
    { id: "notas", name: "Notas e boletins", description: "Lançamento de avaliações, médias e boletins por bimestre." },
    { id: "frequencia", name: "Frequência e ocorrências", description: "Registro de presença, faltas e ocorrências pedagógicas." },
    { id: "calendario", name: "Calendário escolar", description: "Dias letivos, feriados, provas e reuniões." },
    { id: "comunicados", name: "Comunicados", description: "Avisos para turmas, famílias e toda a escola." },
  ],
  medio: [
    { id: "turmas", name: "Turmas e séries", description: "Organize classes por série, turno e itinerário." },
    { id: "alunos", name: "Alunos e responsáveis", description: "Fichas completas, documentos e contatos." },
    { id: "disciplinas", name: "Disciplinas e eletivas", description: "Componentes obrigatórios, optativos e agrupamentos." },
    { id: "notas", name: "Notas e boletins", description: "Lançamento de avaliações, recuperação e boletins." },
    { id: "frequencia", name: "Frequência e ocorrências", description: "Presença, faltas e ocorrências com acompanhamento tutorial." },
    { id: "preparacao", name: "ENEM e vestibulares", description: "Simulados, desempenho por área e metas de estudo." },
    { id: "calendario", name: "Calendário de provas", description: "Provas, simulados e prazos de inscrição." },
    { id: "comunicados", name: "Comunicados", description: "Avisos para turmas, famílias e toda a escola." },
  ],
};

const DEPENDENCY_MODULES: SchoolModule[] = [
  {
    id: "financeiro",
    name: "Financeiro e contratos",
    description: "Mensalidades, boletos/Pix, descontos, contratos e cobrança. Oculto para escolas públicas.",
    dependency: "privada",
  },
  {
    id: "rh",
    name: "Recursos Humanos",
    description: "Vínculos, regime (CLT/PJ/efetivo/temporário), carga horária e lotação.",
  },
  {
    id: "censo_inep",
    name: "Censo Escolar (INEP)",
    description: "Validação e exportação de dados para o Censo/INEP conforme dependência administrativa.",
    dependency: "publica",
  },
  {
    id: "programas_sociais",
    name: "Programas sociais e transporte",
    description: "NIS, Bolsa Família, transporte escolar e merenda. Foco em rede pública.",
    dependency: "publica",
  },
];

export function getSegment(id: string): (typeof SEGMENTS)[SchoolSegment] | null {
  return id in SEGMENTS ? SEGMENTS[id as SchoolSegment] : null;
}

export function getModules(
  segment: SchoolSegment,
  dependency?: AdministrativeDependency,
): SchoolModule[] {
  const base = BASE_MODULES[segment];
  const extra = DEPENDENCY_MODULES.filter(
    (module) => !module.dependency || module.dependency === dependency,
  );
  // Evita duplicar se por algum motivo ids colidirem.
  const seen = new Set(base.map((m) => m.id));
  return [...base, ...extra.filter((m) => !seen.has(m.id))];
}

export const SEGMENT_MODULES = BASE_MODULES;
