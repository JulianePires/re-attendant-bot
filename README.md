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
- [Deploy (Coolify)](#deploy-coolify)

---

## Visão Geral

O sistema é dividido em duas interfaces complementares:

| Interface  | Público       | URL       | Descrição                                 |
| ---------- | ------------- | --------- | ----------------------------------------- |
| **Totem**  | Pacientes     | `/`       | Kiosk touchscreen para entrada na fila    |
| **Painel** | Profissionais | `/painel` | Dashboard de gestão da fila em tempo real |

### Fluxo principal

```
Paciente toca no totem
    │
    ├─ "Entrar na Fila"  → cria Atendimento (tipoChamada: normal)
    └─ "Preciso de Urgência" → cria Atendimento (tipoChamada: urgente)
              │
              ▼
    Profissional vê a fila no painel (atualização via Supabase Realtime)
              │
              ▼
    Profissional clica "Chamar" → Atendimento → status: finalizado
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
| Package manager | Bun                                                     |
| Deploy          | Coolify (Nixpacks)                                      |

---

## Estrutura de Pastas

```
/
├── prisma/
│   └── schema.prisma            # Schema do banco (User, Session, Account, Verification, Atendimento)
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout raiz (Inter, ThemeProvider, QueryProvider)
│   │   ├── page.tsx             # Totem — tela de standby (rota /)
│   │   ├── globals.css          # Tokens Shadcn + variáveis Tailwind v4
│   │   ├── api/
│   │   │   └── auth/[...all]/
│   │   │       └── route.ts     # Handler HTTP do BetterAuth (GET + POST)
│   │   ├── (tablet)/
│   │   │   └── layout.tsx       # Layout kiosk para sub-rotas do totem
│   │   └── (painel)/
│   │       ├── layout.tsx       # Layout administrativo (Sidebar + Header)
│   │       └── painel/
│   │           └── page.tsx     # Dashboard com fila e histórico
│   ├── components/
│   │   ├── tablet/
│   │   │   ├── BotAvatar.tsx    # Avatar animado do assistente virtual
│   │   │   └── BotAvatar.test.tsx
│   │   ├── painel/
│   │   │   ├── Sidebar.tsx      # Navegação lateral (Dashboard, Histórico, Usuários)
│   │   │   ├── Header.tsx       # Header com sessão do usuário (Server Component)
│   │   │   └── SignOutButton.tsx # Botão de logout (Client Component)
│   │   ├── providers/
│   │   │   ├── query-provider.tsx  # TanStack Query (QueryClient por sessão)
│   │   │   └── theme-provider.tsx  # next-themes (dark/light/system)
│   │   └── ui/
│   │       └── button.tsx       # Componentes base Shadcn (gerados via CLI)
│   ├── hooks/
│   │   └── useTTS.ts            # Text-to-Speech nativo (Web Speech API, pt-BR)
│   ├── lib/
│   │   ├── auth.ts              # BetterAuth server — APENAS server-side
│   │   ├── auth-client.ts       # BetterAuth client — hooks para componentes
│   │   ├── prisma.ts            # Singleton do Prisma Client (hot-reload safe)
│   │   ├── supabase-client.ts   # Cliente Supabase (foco em Realtime)
│   │   ├── query-client.ts      # Factory criarQueryClient() com config WebSocket
│   │   └── utils.ts             # cn() = clsx + tailwind-merge
│   ├── server/
│   │   └── actions/             # Server Actions isoladas (a implementar)
│   ├── test/
│   │   └── setup.ts             # @testing-library/jest-dom/vitest
│   └── types/
│       └── index.ts             # Enums, schemas Zod e tipos inferidos
├── .env.example
├── .husky/
│   ├── pre-commit               # lint-staged
│   └── commit-msg               # commitlint
├── .prettierrc
├── commitlint.config.mjs
├── docker-compose.yml           # PostgreSQL local via Podman/Docker
├── eslint.config.mjs
├── next.config.ts               # output: standalone, React Compiler
├── nixpacks.toml                # Config de build para Coolify
├── postcss.config.mjs
├── tsconfig.json
└── vitest.config.ts
```

---

## Pré-requisitos

- [Bun](https://bun.sh) >= 1.1
- [Podman](https://podman.io) ou Docker (banco local)
- Conta no [Supabase](https://supabase.com) (banco de produção + Realtime)
- Instância do [Coolify](https://coolify.io) (deploy)

---

## Instalação e Setup

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd re-attendant-bot

# 2. Instalar dependências
bun install

# 3. Copiar e preencher as variáveis de ambiente
cp .env.example .env.local

# 4. Inicializar o Husky (git hooks)
bun prepare

# 5. Subir o banco de dados local
bun podman:up        # ou: podman compose up -d

# 6. Aplicar o schema ao banco
bun db:push          # rápido para dev (sem migration versionada)
# OU
bun db:migrate       # cria arquivo em prisma/migrations/ (recomendado para produção)

# 7. Iniciar o servidor de desenvolvimento
bun dev
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
┌─────────────────────────────────────────┐
│                  User                   │  ← Gerenciado pelo BetterAuth
├─────────────────────────────────────────┤
│ id            String  @id               │
│ name          String                    │
│ email         String  @unique           │
│ emailVerified Boolean                   │
│ image         String?                   │
│ createdAt     DateTime                  │
│ updatedAt     DateTime                  │
│ ─────── RBAC (plugin Admin) ──────────  │
│ role          String?  default:"paciente"│
│ banned        Boolean?                  │
│ banReason     String?                   │
│ banExpires    DateTime?                 │
│ ─────── Campos da Clínica ────────────  │
│ cpf           String  @unique           │  ← Não exposto na sessão cliente
│ ultimoAcesso  DateTime?                 │
└──────────────┬──────────────────────────┘
               │ 1:N
               ▼
┌─────────────────────────────────────────┐
│               Atendimento               │  ← Tabela de negócio
├─────────────────────────────────────────┤
│ id           String   @id @default(cuid)│
│ pacienteId   String   (FK → User.id)    │
│ tipoChamada  String   default:"normal"  │  "normal" | "urgente"
│ status       String   default:"aguardando"│ "aguardando" | "finalizado"
│ criadoEm    DateTime  @default(now())   │
│ finalizadoEm DateTime?                  │
│ ─────── Índice ────────────────────────  │
│ @@index([status, criadoEm])             │  ← Otimiza queries de fila
└─────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│     Session      │  │     Account      │  │   Verification   │
│ (BetterAuth)     │  │ (BetterAuth)     │  │  (BetterAuth)    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Máquina de estados do Atendimento

```
                  ┌──────────────┐
   [Paciente toca]│   aguardando │──[Profissional chama]──► finalizado
                  └──────────────┘
```

### Comandos do banco

```bash
bun db:generate   # Regenera o Prisma Client após mudanças no schema
bun db:push       # Aplica schema sem criar migration (desenvolvimento)
bun db:migrate    # Cria e aplica migration versionada
bun db:studio     # Abre o Prisma Studio no browser
bun db:reset      # Descarta todas as migrations e recria o banco
```

---

## Rotas da Aplicação

### Arquitetura de Route Groups

```
src/app/
│
├── page.tsx                  →  /
│   Layout: root (ThemeProvider + QueryProvider)
│   Componente: TabletStandbyPage
│
├── (tablet)/
│   layout.tsx                → Kiosk Mode: gradiente sky→indigo,
│   │                           overflow-hidden, select-none
│   └── [sub-rotas futuras]   →  /fila, /sucesso, /aguardando
│
├── (painel)/
│   layout.tsx                → Sidebar + Header (auth server-side)
│   └── painel/
│       page.tsx              →  /painel  (Dashboard)
│
└── api/
    └── auth/[...all]/
        route.ts              →  /api/auth/*  (BetterAuth handler)
```

### Tabela de rotas

| Método     | Rota                | Componente            | Auth           | Descrição                 |
| ---------- | ------------------- | --------------------- | -------------- | ------------------------- |
| `GET`      | `/`                 | `TabletStandbyPage`   | Público        | Tela standby do totem     |
| `GET`      | `/painel`           | `PainelDashboardPage` | `profissional` | Dashboard da fila         |
| `GET`      | `/painel/historico` | _(a implementar)_     | `profissional` | Histórico completo        |
| `GET`      | `/painel/usuarios`  | _(a implementar)_     | `profissional` | Gestão de usuários        |
| `GET/POST` | `/api/auth/*`       | BetterAuth            | —              | Endpoints de autenticação |

### Endpoints BetterAuth gerados automaticamente

| Endpoint                   | Método | Descrição                            |
| -------------------------- | ------ | ------------------------------------ |
| `/api/auth/sign-up/email`  | `POST` | Cadastro com e-mail/senha            |
| `/api/auth/sign-in/email`  | `POST` | Login com e-mail/senha               |
| `/api/auth/sign-out`       | `POST` | Logout                               |
| `/api/auth/session`        | `GET`  | Sessão atual                         |
| `/api/auth/admin/set-role` | `POST` | Alterar role (requer `profissional`) |

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

#### `Sidebar`

`src/components/painel/Sidebar.tsx` — **Client Component**

Navegação lateral com detecção de rota ativa via `usePathname()`. Correspondência exata para `/painel` evita falso-ativo em sub-rotas.

| Link      | Ícone             | Rota                |
| --------- | ----------------- | ------------------- |
| Dashboard | `LayoutDashboard` | `/painel`           |
| Histórico | `History`         | `/painel/historico` |
| Usuários  | `Users`           | `/painel/usuarios`  |

#### `Header`

`src/components/painel/Header.tsx` — **Server Component**

Busca a sessão do usuário no servidor via `auth.api.getSession()`. Renderiza nome do profissional logado e `<SignOutButton>`.

#### `SignOutButton`

`src/components/painel/SignOutButton.tsx` — **Client Component**

Chama `signOut()` do `auth-client` e redireciona para `/` (totem) após logout.

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

| Role         | Valor            | Acesso                             |
| ------------ | ---------------- | ---------------------------------- |
| Paciente     | `"paciente"`     | Totem `/` — criação de atendimento |
| Profissional | `"profissional"` | Painel `/painel` — gestão da fila  |

### Campos do usuário

| Campo          | Tipo        | Exposto na sessão cliente | Descrição                          |
| -------------- | ----------- | ------------------------- | ---------------------------------- |
| `id`           | `string`    | Sim                       | Identificador único                |
| `name`         | `string`    | Sim                       | Nome completo                      |
| `email`        | `string`    | Sim                       | E-mail de login                    |
| `role`         | `string`    | Sim                       | `paciente` ou `profissional`       |
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
bun run test              # modo watch
bun run test --run        # execução única (CI)
bun run test:coverage     # relatório de cobertura em /coverage
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
bun dev                   # Next.js com Turbopack
bun build                 # Build de produção
bun start                 # Servidor de produção

# Qualidade de código
bun lint                  # ESLint
bun lint:fix              # ESLint com auto-fix
bun format                # Prettier (escreve)
bun format:check          # Prettier (verifica, usado em CI)
bun type-check            # tsc --noEmit

# Testes
bun run test              # Vitest (watch)
bun run test:ui           # Vitest UI no browser
bun run test:coverage     # Cobertura de código

# Banco de dados
bun db:generate           # Gera Prisma Client
bun db:push               # Aplica schema sem migration
bun db:migrate            # Cria + aplica migration versionada
bun db:studio             # Prisma Studio no browser
bun db:reset              # Reseta o banco completamente

# Banco local (Podman)
bun podman:up             # Sobe PostgreSQL em background
bun podman:down           # Para o container (dados preservados)
bun podman:reset          # Para + apaga volume (dados perdidos)
bun podman:logs           # Tail dos logs do container

# Git hooks
bun prepare               # Instala Husky
```

---

## Deploy (Coolify)

O deploy usa **Nixpacks** com `output: standalone` do Next.js.

### Fluxo de CI/CD

```
git push
    │
    ▼ Coolify detecta evento
    ├─ bun install --frozen-lockfile
    ├─ bunx prisma generate
    ├─ bun run build               (output: standalone)
    └─ cp assets → .next/standalone/
    │
    ▼ Pre-deploy Command
    bunx prisma migrate deploy     (aplica migrações pendentes)
    │
    ▼
    node .next/standalone/server.js  (porta 3000)
```

### Variáveis obrigatórias no Coolify

Todas as variáveis do `.env.example` devem ser configuradas em **Environment Variables** antes do primeiro deploy. As variáveis `NEXT_PUBLIC_*` são embutidas no bundle durante o build.

### Configuração no Coolify

| Campo              | Valor                        |
| ------------------ | ---------------------------- |
| Build Pack         | Nixpacks                     |
| Port               | `3000`                       |
| Pre-deploy Command | `bunx prisma migrate deploy` |

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
