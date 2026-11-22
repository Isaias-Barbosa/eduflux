# EduFlux

Plataforma SaaS de gestão escolar com configuração inicial por tipo de instituição. Uma mesma conta pode administrar várias escolas, e cada escola recebe os módulos pedagógicos do seu segmento.

## Segmentos

| Segmento | Público | Módulos habilitados |
| --- | --- | --- |
| Jardim de infância | Berçário aos 5 anos | Turmas e faixas etárias, crianças e responsáveis, diário de bordo, acompanhamento do desenvolvimento, eventos, comunicados |
| Ensino fundamental | 1º ao 9º ano | Turmas e séries, alunos e responsáveis, disciplinas, notas e boletins, frequência e ocorrências, calendário escolar, comunicados |
| Ensino médio | 1ª ao 3ª série | Turmas e séries, alunos e responsáveis, disciplinas e eletivas, notas e boletins, frequência e ocorrências, ENEM e vestibulares, calendário de provas, comunicados |

O catálogo fica em `src/lib/schools/segments.ts`. É a partir dele que a interface mostra os módulos de cada segmento.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- Better Auth com e-mail e senha
- Drizzle ORM com libSQL (arquivo SQLite local por padrão)

O banco local fica em `data/eduflux.db` e não é versionado. Para produção, a URL pode ser trocada para um banco libSQL/Turso compatível sem alterar a camada de acesso.

## Executar localmente

Requer Node.js 22.12 ou superior.

```bash
npm install
cp .env.example .env.local
npx auth secret          # gere o BETTER_AUTH_SECRET e cole no .env.local
npm run db:migrate
npm run dev
```

Acesse `http://localhost:3000`. Crie uma conta em `/login?mode=signup`, clique em **Nova escola** e siga o assistente de três etapas:

1. Tipo de ensino (jardim de infância, fundamental ou médio)
2. Dados da instituição (nome, CNPJ, contatos e endereço completo)
3. Direção e revisão (nome, e-mail e telefone da direção + resumo dos módulos)

Ao concluir, a escola é salva com um vínculo de administrador para a conta atual e a página da escola mostra os dados e os módulos habilitados.

## Rotas principais

| Rota | Uso |
| --- | --- |
| `/` | Landing pública; redireciona usuários autenticados para o painel |
| `/login` | Entrar ou criar conta |
| `/dashboard` | Lista de escolas da conta e contadores por segmento |
| `/dashboard/escolas/nova` | Assistente de configuração inicial |
| `/dashboard/escolas/[id]` | Resumo da escola e módulos do segmento |
| `/api/auth/[...all]` | Handler do Better Auth |
| `/api/schools` | `POST` — cria escola, vínculo de admin e slug único |

## Estrutura

- `src/lib/db/`: schemas do Better Auth (`auth-schema.ts`), da aplicação (`schema.ts`) e cliente Drizzle.
- `src/lib/schools/`: catálogo de segmentos/módulos e validação Zod do cadastro.
- `src/lib/auth.ts` e `src/lib/session.ts`: configuração do Better Auth e checagem de sessão no servidor.
- `src/components/`: formulário de autenticação, assistente de escola e botão de sair.
- `src/proxy.ts`: redirecionamento de visitantes sem cookie de sessão. A validação real acontece no servidor.
- `drizzle/`: migrações SQL geradas.

## Scripts

```bash
npm run dev            # servidor de desenvolvimento
npm run build          # build de produção
npm run lint           # ESLint
npm run typecheck      # TypeScript
npm run db:generate    # gera migração após alterar o schema
npm run db:migrate     # aplica migrações
npm run db:push        # sincroniza schema direto (desenvolvimento)
npm run auth:generate  # regenera o schema do Better Auth
```

## Próximos passos

- Implementar os módulos listados no resumo de cada escola.
- Trocar o cadastro livre por convites de administração antes de abrir ao público.
- Separar configurações por escola (tema, dados pedagógicos e parâmetros de cada módulo).
- Adicionar perfis de secretaria e professores aos vínculos de escola.

## Segurança

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `DATABASE_URL` ficam apenas no ambiente (`.env.local`, ignorado pelo Git). Em produção, use um segredo novo, defina a URL pública correta e não habilite o cadastro livre sem uma política de convites.
