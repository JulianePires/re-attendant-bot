# Sistema de Autoatendimento e Gestão de Fila em Tempo Real

Sistema clínico fullstack que combina um **totem de autoatendimento** (tablet para pacientes) com um **painel administrativo** (profissionais de saúde), com atualizações da fila via WebSocket em tempo real.

---

## Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Setup](#instalação-e-setup)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Banco de Dados](#banco-de-dados)
- [Rotas da Aplicação](#rotas-da-aplicação)
- [Componentes](#componentes)
- [Hooks](#hooks)
- [Autenticação e RBAC](#autenticação-e-rbac)
- [Testes](#testes)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Deploy (Vercel)](#deploy-vercel)

---

## Visão Geral

O sistema é dividido em interfaces complementares:

| Interface   | Público        | URL         | Descrição                                                        |
| ----------- | -------------- | ----------- | ---------------------------------------------------------------- |
| **Totem**   | Pacientes      | `/recepcao` | Kiosk touchscreen para entrada na fila (`/` redireciona para cá) |
| **TV**      | Sala de espera | `/tv`       | Fila pública em tempo real com alerta sonoro                     |
| **Monitor** | Sala de espera | `/monitor`  | Fila pública com tempo de espera e campainha                     |
| **Painel**  | Profissionais  | `/adm`      | Gestão da fila, histórico, equipe e usuários                     |

### Fluxo principal

```
Paciente informa o nome no totem (/recepcao)
    │
    ├─ "Entrar na Fila"      → cria Atendimento (tipoChamada: normal)
    └─ "Preciso de Urgência" → cria Atendimento (tipoChamada: urgente)
              │   (em ambos os casos: + Notificacao para cada profissional/admin)
              ▼
    Fila atualizada em tempo real (Supabase Realtime) no painel, TV e monitor
              │
              ▼
    Profissional finaliza → Atendimento.status = finalizado
              │
              ▼
    Fim do turno → finalizados do turno são arquivados (arquivadoTurno = true)
```

---

## Stack Tecnológica

| Camada          | Tecnologia                                              |
| --------------- | ------------------------------------------------------- |
| Framework       | Next.js 16 (App Router) + React 19                      |
| Linguagem       | TypeScript 5 (strict mode)                              |
| Estilização     | Tailwind CSS v4 + Shadcn UI                             |
| Ícones          | Lucide React                                            |
| Animações       | Lottie React (integração pendente)                      |
| ORM             | Prisma 6                                                |
| Banco de dados  | PostgreSQL (Supabase)                                   |
| Autenticação    | BetterAuth com plugin Admin (RBAC)                      |
| Estado servidor | TanStack Query v5                                       |
| Realtime        | Supabase Realtime (WebSocket)                           |
| Formulários     | React Hook Form + Zod                                   |
| Testes          | Vitest + React Testing Library + jsdom                  |
| Linting         | ESLint 9 + Prettier + eslint-config-prettier            |
| Commits         | Husky + lint-staged + commitlint (Conventional Commits) |
| Package manager | pnpm                                                    |
| Deploy          | Vercel                                                  |

---

## Estrutura de Pastas

```
/
├── prisma/
│   ├── schema.prisma            # User, Session, Account, Verification, Notificacao, Atendimento
│   ├── migrations/
│   └── seed.ts                  # Cria usuário admin padrão (banco vazio)
├── public/                      # Assets (inclui sons de notificação)
├── src/
│   ├── proxy.ts                 # Proteção de rotas (substitui o middleware.ts no Next 16)
│   ├── app/
│   │   ├── layout.tsx           # Layout raiz (fontes, ThemeProvider, QueryProvider, Analytics)
│   │   ├── page.tsx             # / → redireciona para /recepcao
│   │   ├── forbidden.tsx        # Página 403 (authInterrupts)
│   │   ├── recepcao/            # Totem do paciente
│   │   ├── tv/                  # Tela pública da TV
│   │   ├── monitor/             # Monitor público da fila
│   │   ├── adm/                 # Painel (layout com PainelHeader + BottomNav)
│   │   │   ├── login/
│   │   │   ├── historico/
│   │   │   ├── equipe/          # Apenas admin
│   │   │   └── usuarios/        # Apenas admin (inclui /novo)
│   │   ├── (auth)/              # /esqueci-a-senha, /redefinir-senha
│   │   └── api/auth/[...all]/   # Handler HTTP do BetterAuth
│   ├── components/
│   │   ├── common/              # atoms/molecules compartilhados
│   │   ├── dashboard/           # atoms/molecules/organisms do painel
│   │   ├── painel/              # Shell do painel (header, navegação, notificações, diálogos)
│   │   ├── tablet/              # Totem (rosto do robô, fluxo de interação, formulário)
│   │   ├── providers/           # Query, tema, overlay de carregamento
│   │   └── ui/                  # Componentes Shadcn (gerados via CLI)
│   ├── hooks/                   # Realtime da fila, notificações, sons, TTS
│   ├── lib/
│   │   ├── auth.ts              # BetterAuth server — APENAS server-side
│   │   ├── auth-client.ts       # BetterAuth client
│   │   ├── prisma.ts            # Singleton do Prisma Client
│   │   ├── supabase-client.ts   # Cliente Supabase (apenas Realtime)
│   │   ├── constants.ts         # APP_ROUTES
│   │   ├── email/               # Envio de e-mails (SMTP) e templates
│   │   ├── utils/turnos.ts      # Cálculo do turno atual
│   │   └── validations/
│   ├── server/actions/          # Server Actions (atendimento, histórico, notificações, usuários, senha)
│   ├── test/setup.ts
│   └── types/index.ts           # Constantes, schemas Zod e tipos inferidos
├── docker-compose.yml           # PostgreSQL local via Podman/Docker
└── next.config.ts               # React Compiler + authInterrupts
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org) >= 20 e [pnpm](https://pnpm.io) >= 10
- [Podman](https://podman.io) ou Docker (banco local)
- Conta no [Supabase](https://supabase.com) (banco de produção + Realtime)
- Projeto na [Vercel](https://vercel.com) (deploy)

---

## Instalação e Setup

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd re-attendant-bot

# 2. Instalar dependências
pnpm install

# 3. Copiar e preencher as variáveis de ambiente
cp .env.example .env.local

# 4. Inicializar o Husky (git hooks)
pnpm prepare

# 5. Subir o banco de dados local
pnpm podman:up            # ou: podman compose up -d

# 6. Aplicar o schema ao banco
pnpm db:push              # rápido para dev (sem migration versionada)
# OU
pnpm db:migrate           # cria arquivo em prisma/migrations/ (recomendado para produção)

# 7. Iniciar o servidor de desenvolvimento
pnpm dev
```

---

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
# ── Banco de Dados ────────────────────────────────────────────────────
# Via pooler (Supabase Transaction Pooler, porta 6543) — usado em runtime
DATABASE_URL="postgresql://postgres.[REF]:[SENHA]@aws-0-[REGIÃO].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Conexão direta (porta 5432) — usado apenas para prisma migrate deploy
DIRECT_URL="postgresql://postgres.[REF]:[SENHA]@aws-0-[REGIÃO].pooler.supabase.com:5432/postgres"

# ── Supabase ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# ── BetterAuth ────────────────────────────────────────────────────────
# Gere com: openssl rand -base64 32
BETTER_AUTH_SECRET="string-aleatoria-de-32-chars"
BETTER_AUTH_URL="http://localhost:3000"       # URL base da API
NEXT_PUBLIC_APP_URL="http://localhost:3000"   # URL pública (browser)
```

> **Desenvolvimento local:** substitua `DATABASE_URL` e `DIRECT_URL` por:
>
> ```bash
> DATABASE_URL="postgresql://postgres:postgres@localhost:5432/re_attendant"
> DIRECT_URL="postgresql://postgres:postgres@localhost:5432/re_attendant"
> ```

---

## Banco de Dados

### Modelagem

```
┌────────────────────────────────────────────────┐
│                      User                      │  ← BetterAuth (apenas profissionais/admin)
├────────────────────────────────────────────────┤
│ id            String    @id                    │
│ name          String                           │
│ email         String?   @unique                │
│ emailVerified Boolean                          │
│ image         String?                          │
│ createdAt     DateTime                         │
│ updatedAt     DateTime                         │
│ ─────── RBAC (plugin Admin) ─────────────────  │
│ role          String?   default:"profissional" │  "admin" | "profissional"
│ banned        Boolean?                         │
│ banReason     String?                          │
│ banExpires    DateTime?                        │
│ ─────── Campos da Clínica ───────────────────  │
│ cpf           String?   @unique                │  ← Não exposto na sessão cliente
│ ultimoAcesso  DateTime?                        │
└───────────────────────┬────────────────────────┘
                        │ 1:N
                        ▼
┌────────────────────────────────────────────────┐
│                  Notificacao                   │
├────────────────────────────────────────────────┤
│ id         String          @id @default(cuid)  │
│ titulo     String                              │
│ mensagem   String                              │
│ tipo       TipoNotificacao default:NORMAL      │  URGENTE | NORMAL
│ lida       Boolean         default:false       │
│ criadoEm   DateTime        @default(now())     │
│ usuarioId  String          (FK → User.id)      │  onDelete: Cascade
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│                  Atendimento                   │  ← Sem relação com User
├────────────────────────────────────────────────┤
│ id             String    @id @default(cuid)    │
│ nomePaciente   String                          │  ← Nome digitado no totem
│ tipoChamada    String    default:"normal"      │  "normal" | "urgente"
│ status         String    default:"aguardando"  │  "aguardando" | "finalizado"
│ criadoEm       DateTime  @default(now())       │
│ finalizadoEm   DateTime?                       │
│ arquivadoTurno Boolean   default:false         │
│ ─────── Índice ──────────────────────────────  │
│ @@index([status, criadoEm])                    │  ← Otimiza queries de fila
└────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│     Session      │  │     Account      │  │   Verification   │
│   (BetterAuth)   │  │   (BetterAuth)   │  │   (BetterAuth)   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

No banco, as tabelas têm nomes minúsculos (`user`, `atendimento`, `notificacao`, …) via `@@map`.

### Máquina de estados do Atendimento

```
[Paciente no totem] → aguardando ──[Profissional finaliza]──► finalizado ──[Fim do turno]──► arquivadoTurno = true
```

Turnos (`src/lib/utils/turnos.ts`): manhã (06:00–11:59), tarde (12:00–17:59) e noite. A fila ativa e os atendimentos do dia consideram apenas o turno atual; arquivar o turno marca os finalizados com `arquivadoTurno = true`, sem apagá-los.

### Comandos do banco

```bash
pnpm db:generate          # Regenera o Prisma Client após mudanças no schema
pnpm db:push              # Aplica schema sem criar migration (desenvolvimento)
pnpm db:migrate           # Cria e aplica migration versionada
pnpm db:studio            # Abre o Prisma Studio no browser
pnpm db:reset             # Descarta todas as migrations e recria o banco
```

---

## Rotas da Aplicação

### Tabela de rotas

| Rota                 | Acesso                 | Descrição                                   |
| -------------------- | ---------------------- | ------------------------------------------- |
| `/`                  | Público                | Redireciona para `/recepcao`                |
| `/recepcao`          | Público                | Totem de autoatendimento                    |
| `/tv`                | Público                | Fila pública para TV                        |
| `/monitor`           | Público                | Monitor público da fila                     |
| `/adm/login`         | Apenas não autenticado | Login de profissionais e admin              |
| `/adm`               | Autenticado            | Dashboard da fila ativa                     |
| `/adm/historico`     | Autenticado            | Atendimentos do dia / arquivamento do turno |
| `/adm/equipe`        | `admin`                | Gerenciamento da equipe                     |
| `/adm/usuarios`      | `admin`                | Gestão de usuários                          |
| `/adm/usuarios/novo` | `admin`                | Cadastro de profissional                    |
| `/esqueci-a-senha`   | Apenas não autenticado | Solicitação de recuperação de senha         |
| `/redefinir-senha`   | Apenas não autenticado | Redefinição de senha via token              |
| `/api/auth/*`        | —                      | Endpoints do BetterAuth                     |

URLs antigas `/painel/*` redirecionam para `/adm/*`.

A autenticação é verificada em `src/proxy.ts`. A restrição ao role `admin` é feita no servidor, em cada página (`forbidden()` → `src/app/forbidden.tsx`) e nas Server Actions.

### Endpoints BetterAuth gerados automaticamente

| Endpoint                   | Método | Descrição                   |
| -------------------------- | ------ | --------------------------- |
| `/api/auth/sign-up/email`  | `POST` | Cadastro com e-mail/senha   |
| `/api/auth/sign-in/email`  | `POST` | Login com e-mail/senha      |
| `/api/auth/sign-out`       | `POST` | Logout                      |
| `/api/auth/session`        | `GET`  | Sessão atual                |
| `/api/auth/admin/set-role` | `POST` | Alterar role (plugin Admin) |

---

## Componentes

### Tablet (área do paciente)

#### `BotAvatar`

`src/components/tablet/BotAvatar.tsx`

Avatar do assistente virtual. Placeholder visual com `role="img"` e `aria-label` para acessibilidade. Pronto para receber animação Lottie.

```tsx
<BotAvatar tamanho="lg" className="..." />
```

| Prop        | Tipo                   | Padrão | Descrição          |
| ----------- | ---------------------- | ------ | ------------------ |
| `tamanho`   | `"sm" \| "md" \| "lg"` | `"lg"` | Tamanho do avatar  |
| `className` | `string?`              | —      | Classes adicionais |

> **Integração Lottie:** coloque o JSON em `src/assets/bot-face.json` e substitua o `<div>` placeholder pelo `<Lottie>` conforme os comentários no arquivo.

---

### Painel (área do profissional)

O layout `src/app/adm/layout.tsx` (Client Component) monta o shell do painel e oculta o header em modo tela cheia.

| Componente         | Descrição                                                          |
| ------------------ | ------------------------------------------------------------------ |
| `PainelHeader`     | Header com usuário logado, `NotificationBell`, tela cheia e logout |
| `BottomNav`        | Navegação inferior: Início, Histórico, Gerenciamento, Usuários     |
| `NotificationBell` | Notificações de novos pacientes (`Notificacao`)                    |
| `SignOutButton`    | Logout via `auth-client`                                           |
| `AtendimentoCard`  | Card de paciente na fila                                           |

---

### Providers

#### `QueryProvider`

`src/components/providers/query-provider.tsx`

Instancia o `QueryClient` via `useState` (uma instância por sessão, evita vazamento de cache em SSR). Configurações otimizadas para Realtime:

| Opção                  | Valor      | Motivo                               |
| ---------------------- | ---------- | ------------------------------------ |
| `refetchOnWindowFocus` | `false`    | Fila já é atualizada via WebSocket   |
| `refetchOnReconnect`   | `true`     | Revalida após reconexão de rede      |
| `staleTime`            | `30_000ms` | Cache válido por 30s                 |
| `retry`                | `1`        | Uma tentativa em falhas transitórias |

#### `ThemeProvider`

`src/components/providers/theme-provider.tsx`

Wrapper do `next-themes`. Gerencia `class="dark"` no `<html>` com `suppressHydrationWarning`.

---

## Hooks

### `useTTS`

`src/hooks/useTTS.ts` — **Client-only**

Text-to-Speech nativo via Web Speech API. Sem dependência externa. Seleciona automaticamente voz `pt-BR` se disponível no dispositivo.

```tsx
const { falar, parar, suportado } = useTTS();

falar("Você entrou na fila de atendimento.");
falar("Mensagem personalizada.", { velocidade: 0.8, tom: 1.1 });
parar();
```

| Retorno                 | Tipo       | Descrição                              |
| ----------------------- | ---------- | -------------------------------------- |
| `falar(texto, opcoes?)` | `function` | Sintetiza voz em pt-BR                 |
| `parar()`               | `function` | Cancela fala em andamento              |
| `suportado`             | `boolean`  | `false` em SSR ou browsers sem suporte |

| Opção        | Tipo     | Padrão | Descrição             |
| ------------ | -------- | ------ | --------------------- |
| `velocidade` | `number` | `0.92` | Taxa de fala (0.1–10) |
| `tom`        | `number` | `1`    | Tom da voz (0–2)      |
| `volume`     | `number` | `1`    | Volume (0–1)          |

> **Compatibilidade:** Chrome, Edge e Safari modernos. Firefox tem suporte limitado. Inerte em SSR (verificação de `window`).

---

## Autenticação e RBAC

### Arquitetura

```
[Browser]                          [Servidor]
auth-client.ts ─── HTTP ──► /api/auth/[...all]/route.ts
  useSession()                          │
  signIn.email()                    auth.ts (BetterAuth)
  signOut()                             │
  adminClient()               prismaAdapter → PostgreSQL
```

### Roles

| Role         | Valor            | Acesso                                                 |
| ------------ | ---------------- | ------------------------------------------------------ |
| Profissional | `"profissional"` | Painel `/adm` — fila e histórico                       |
| Admin        | `"admin"`        | Tudo do profissional + `/adm/equipe` e `/adm/usuarios` |

Pacientes **não** são usuários do sistema: o totem é público e o `Atendimento` guarda apenas `nomePaciente`.

### Campos do usuário

| Campo          | Tipo        | Exposto na sessão cliente | Descrição                          |
| -------------- | ----------- | ------------------------- | ---------------------------------- |
| `id`           | `string`    | Sim                       | Identificador único                |
| `name`         | `string`    | Sim                       | Nome completo                      |
| `email`        | `string`    | Sim                       | E-mail de login                    |
| `role`         | `string`    | Sim                       | `profissional` ou `admin`          |
| `cpf`          | `string`    | **Não**                   | Dado sensível — apenas server-side |
| `ultimoAcesso` | `DateTime?` | Sim                       | Timestamp do último acesso         |

### Sessão

- Renovada automaticamente a cada **1 hora** de atividade
- Expira após **30 dias** de inatividade total
- Gerenciada por cookie HttpOnly

---

## Testes

### Setup

```
vitest.config.ts        → environment: jsdom, globals: true, alias @/*
src/test/setup.ts       → import "@testing-library/jest-dom/vitest"
```

### Executar testes

```bash
pnpm test                 # modo watch
pnpm test run             # execução única (CI)
pnpm test:coverage        # relatório de cobertura em /coverage
```

### Cobertura atual

| Arquivo         | Testes | Status      |
| --------------- | ------ | ----------- |
| `BotAvatar.tsx` | 5      | ✅ Passando |

### Convenções

- Arquivos de teste: `*.test.tsx` ou `*.spec.tsx` ao lado do componente
- Asserções de DOM: matchers do `@testing-library/jest-dom` (`toBeInTheDocument`, `toHaveClass`, etc.)
- Cobertura excluída: `src/app/**` (rotas Next.js), `src/types/**`, `src/lib/prisma.ts`

---

## Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev                  # Next.js com Turbopack
pnpm build                # Build de produção
pnpm start                # Servidor de produção

# Qualidade de código
pnpm lint                 # ESLint
pnpm lint:fix             # ESLint com auto-fix
pnpm format               # Prettier (escreve)
pnpm format:check         # Prettier (verifica, usado em CI)
pnpm type-check           # tsc --noEmit

# Testes
pnpm test                 # Vitest (watch)
pnpm test:ui              # Vitest UI no browser
pnpm test:coverage        # Cobertura de código

# Banco de dados
pnpm db:generate          # Gera Prisma Client
pnpm db:push              # Aplica schema sem migration
pnpm db:migrate           # Cria + aplica migration versionada
pnpm db:seed              # Cria usuário admin padrão (se banco vazio)
pnpm db:studio            # Prisma Studio no browser
pnpm db:reset             # Reseta o banco completamente

# Banco local (Podman)
pnpm podman:up            # Sobe PostgreSQL em background
pnpm podman:down          # Para o container (dados preservados)
pnpm podman:reset         # Para + apaga volume (dados perdidos)
pnpm podman:logs          # Tail dos logs do container

# Git hooks
pnpm prepare              # Instala Husky
```

### Rotas de autenticação

- `/adm/login`: login de profissionais e admin
- `/esqueci-a-senha`: solicitação de recuperação de senha
- `/redefinir-senha`: redefinição de senha via token

### Credenciais iniciais (seed)

Após rodar `pnpm db:seed` com banco vazio:

- Email: `admin@clinica.com`
- Senha: use o fluxo "Esqueci a Senha" para definir a primeira senha

---

## Deploy (Vercel)

O deploy é feito na **Vercel**, que detecta Next.js e pnpm (via `pnpm-lock.yaml` / campo `packageManager`) automaticamente — não há `vercel.json`.

### Fluxo de CI/CD

```
git push
    │
    ▼ Vercel detecta o push (preview em branches, produção na main)
    ├─ pnpm install
    └─ pnpm build                  (prisma generate && next build)
```

### Migrações

As migrações **não** rodam no build. Ao publicar uma mudança de schema, aplique-as manualmente usando a `DIRECT_URL` (conexão direta, porta 5432):

```bash
pnpm exec prisma migrate deploy
```

### Variáveis de ambiente

Todas as variáveis do `.env.example` (e as de SMTP) devem ser configuradas em **Project Settings → Environment Variables** na Vercel antes do primeiro deploy. As variáveis `NEXT_PUBLIC_*` são embutidas no bundle durante o build, então alterá-las exige um novo deploy. Novos domínios devem ser adicionados também em `trustedOrigins` em `src/lib/auth.ts`.

---

## Convenções de Commit

O projeto utiliza [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     nova funcionalidade
fix:      correção de bug
chore:    tarefas de manutenção (deps, config)
docs:     documentação
test:     adição ou correção de testes
refactor: refatoração sem mudança de comportamento
style:    formatação, sem mudança de lógica
```

Exemplos:

```bash
git commit -m "feat: adicionar server action de criação de atendimento"
git commit -m "fix: corrigir loop de fala no useTTS ao clicar duas vezes"
git commit -m "chore: atualizar @tanstack/react-query para 5.75"
```
