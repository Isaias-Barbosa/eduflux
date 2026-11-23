/**
 * Catálogo de tipos de ensino. Cada segmento habilita um conjunto diferente
 * de módulos no painel da escola.
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
] as const;

export type SchoolModuleId = (typeof SCHOOL_MODULE_IDS)[number];

export type SchoolModule = {
  id: SchoolModuleId;
  name: string;
  description: string;
};

export const SEGMENT_MODULES: Record<SchoolSegment, SchoolModule[]> = {
  infantil: [
    {
      id: "turmas",
      name: "Turmas e faixas etárias",
      description: "Organize salas por idade e faixa de desenvolvimento.",
    },
    {
      id: "criancas",
      name: "Crianças e responsáveis",
      description: "Cadastros com vínculos familiares e contatos de emergência.",
    },
    {
      id: "diario",
      name: "Diário de bordo",
      description: "Registros diários de atividades, sono e alimentação.",
    },
    {
      id: "desenvolvimento",
      name: "Acompanhamento do desenvolvimento",
      description: "Marcos de aprendizagem e observações da equipe pedagógica.",
    },
    {
      id: "eventos",
      name: "Eventos e comemorações",
      description: "Calendário de festas, passeios e reuniões de família.",
    },
    {
      id: "comunicados",
      name: "Comunicados",
      description: "Avisos e recados enviados aos responsáveis.",
    },
  ],
  fundamental: [
    {
      id: "turmas",
      name: "Turmas e séries",
      description: "Organize classes por ano, turno e série.",
    },
    {
      id: "alunos",
      name: "Alunos e responsáveis",
      description: "Fichas completas, documentos e contatos.",
    },
    {
      id: "disciplinas",
      name: "Disciplinas",
      description: "Componentes curriculares e professores responsáveis.",
    },
    {
      id: "notas",
      name: "Notas e boletins",
      description: "Lançamento de avaliações, médias e boletins por bimestre.",
    },
    {
      id: "frequencia",
      name: "Frequência e ocorrências",
      description: "Registro de presença, faltas e ocorrências pedagógicas.",
    },
    {
      id: "calendario",
      name: "Calendário escolar",
      description: "Dias letivos, feriados, provas e reuniões.",
    },
    {
      id: "comunicados",
      name: "Comunicados",
      description: "Avisos para turmas, famílias e toda a escola.",
    },
  ],
  medio: [
    {
      id: "turmas",
      name: "Turmas e séries",
      description: "Organize classes por série, turno e itinerário.",
    },
    {
      id: "alunos",
      name: "Alunos e responsáveis",
      description: "Fichas completas, documentos e contatos.",
    },
    {
      id: "disciplinas",
      name: "Disciplinas e eletivas",
      description: "Componentes obrigatórios, optativos e agrupamentos.",
    },
    {
      id: "notas",
      name: "Notas e boletins",
      description: "Lançamento de avaliações, recuperação e boletins.",
    },
    {
      id: "frequencia",
      name: "Frequência e ocorrências",
      description: "Presença, faltas e ocorrências com acompanhamento tutorial.",
    },
    {
      id: "preparacao",
      name: "ENEM e vestibulares",
      description: "Simulados, desempenho por área e metas de estudo.",
    },
    {
      id: "calendario",
      name: "Calendário de provas",
      description: "Provas, simulados e prazos de inscrição.",
    },
    {
      id: "comunicados",
      name: "Comunicados",
      description: "Avisos para turmas, famílias e toda a escola.",
    },
  ],
};

export function getSegment(id: string): (typeof SEGMENTS)[SchoolSegment] | null {
  return id in SEGMENTS ? SEGMENTS[id as SchoolSegment] : null;
}

export function getModules(segment: SchoolSegment): SchoolModule[] {
  return SEGMENT_MODULES[segment];
}
