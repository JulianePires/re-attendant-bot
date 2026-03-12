# re-attendant-bot

Aplicacao web para gestao de fila de atendimento com foco em recepcao, chamada de pacientes e acompanhamento em tempo real. O projeto usa Next.js com App Router, autenticacao com BetterAuth, persistencia em PostgreSQL via Prisma e sincronizacao de eventos por Realtime do Supabase.

Este README define a base tecnica do projeto em linguagem objetiva e orientada a implementacao. O objetivo aqui e deixar claro o contrato de arquitetura, a estrutura de diretorios e os blocos iniciais de codigo para a infraestrutura do passo 1.

## Objetivo do produto

O sistema atende dois perfis principais:

- `paciente`: acompanha o proprio status de atendimento e pode ser chamado na fila.
- `profissional`: visualiza a fila, dispara chamadas normais ou urgentes e finaliza atendimentos.

O fluxo principal esperado e:

1. O usuario autentica no sistema.
2. O paciente entra ou acompanha a fila de atendimento.
3. O profissional visualiza os atendimentos pendentes no painel.
4. Uma chamada `normal` ou `urgente` e disparada para o paciente.
5. O estado da fila e refletido em tempo real para painel, tablet e demais clientes conectados.
6. O atendimento e finalizado e o historico fica persistido na base.

## Stack tecnologica obrigatoria

- Gerenciador de pacotes: Bun.
- Core: Next.js 15+, React 19 e TypeScript.
- Banco de dados e ORM: PostgreSQL com Supabase e Prisma ORM.
- Autenticacao: BetterAuth com RBAC por papel `paciente` e `profissional`.
- Estado e realtime: TanStack Query integrado ao `@supabase/supabase-js` para eventos da fila.
- UI e estilização: Tailwind CSS, Shadcn UI, Lucide React e `lottie-react`.
- Formularios e validacao: React Hook Form e Zod.
- Qualidade: ESLint, Prettier, Vitest, Husky, lint-staged e commitlint.

## Estrutura de diretorios esperada

O projeto deve evoluir para a seguinte organizacao:

```text
/
├── prisma/                 # schema.prisma
├── public/
├── src/
│   ├── app/                # (auth), (painel), (tablet), api/auth/[...all]
│   ├── components/         # ui/, tablet/, painel/, providers/
│   ├── hooks/              # useRealtimeQueue, useCampainha
│   ├── lib/                # prisma.ts, supabase-client.ts, auth.ts, query-client.ts
│   ├── server/             # actions/ (Server Actions isoladas)
│   └── types/              # index.ts (tipos globais e schemas Zod)
```

### Responsabilidade de cada area

- `src/app`: rotas, layouts, paginas e handlers HTTP do App Router.
- `src/components/ui`: componentes base do Shadcn UI.
- `src/components/tablet`: interface focada em chamada visual de pacientes.
- `src/components/painel`: componentes do painel operacional.
- `src/components/providers`: providers globais como QueryClient e tema.
- `src/hooks`: hooks de integracao com Realtime, fila e campainha.
- `src/lib`: clientes, adaptadores e configuracoes compartilhadas.
- `src/server/actions`: regras de mutacao executadas no servidor.
- `src/types`: contratos compartilhados entre UI, server actions e validacao.

## Modelagem de dados

### User

A tabela `User` estende a base do BetterAuth e deve conter:

- `cpf`: identificador unico do paciente ou profissional.
- `role`: papel do usuario, com default `paciente`.
- `ultimoAcesso`: data do ultimo acesso relevante para auditoria e suporte operacional.

### Atendimento

A entidade `Atendimento` representa a fila de negocio e deve conter:

- `id`
- `pacienteId`
- `tipoChamada`: `normal` ou `urgente`
- `status`: `aguardando` ou `finalizado`
- `criadoEm`
- `finalizadoEm`

## Funcionalidades esperadas

### Autenticacao e autorizacao

- Login por email e senha com BetterAuth.
- Controle de acesso por papel.
- Sessao persistida no cliente.
- Mapeamento de campos customizados no modelo de usuario.

### Gestao de fila

- Cadastro e listagem de atendimentos.
- Atualizacao de status sem polling agressivo.
- Chamada normal e urgente com propagacao em tempo real.
- Finalizacao de atendimento com carimbo temporal.

### Experiencia de interface

- Painel operacional para profissionais.
- Tela de tablet para exibicao da fila e chamadas.
- Componentes consistentes com Tailwind CSS e Shadcn UI.
- Iconografia com Lucide React e animacoes com Lottie.

## Ambiente local

### Requisitos

- Bun instalado e configurado como gerenciador principal.
- PostgreSQL acessivel via Supabase.
- Variaveis de ambiente configuradas para banco, auth e realtime.

### Variaveis de ambiente esperadas

```bash
DATABASE_URL=
DIRECT_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Instalação

Use Bun como fluxo padrao:

```bash
bun install
```

Este repositorio foi ajustado para usar o `.npmrc` local em novos terminais do VS Code. Em ambiente WSL, confirme que o Bun em uso e o binario Linux nativo, normalmente em `/home/piresjuliane/.bun/bin/bun`, e nao um shim do Windows.

Se for necessario forcar o uso do `.npmrc` local manualmente:

```bash
NPM_CONFIG_USERCONFIG="$PWD/.npmrc" \
NPM_CONFIG_GLOBALCONFIG=/dev/null \
bun install
```

### Comandos principais

```bash
bun dev
bun run build
bun run start
bun run lint
bun run test
```

## Passo 1: infraestrutura base

Os blocos abaixo representam a base inicial para a implementacao. Eles estao organizados pelos arquivos pedidos no passo 1.

### 1. package.json

```json
{
	"name": "re-attendant-bot",
	"version": "0.1.0",
	"private": true,
	"packageManager": "bun@1.3.10",
	"scripts": {
		"dev": "bunx next dev",
		"build": "bunx next build",
		"start": "bunx next start",
		"lint": "bunx eslint .",
		"lint:fix": "bunx eslint . --fix",
		"format": "bunx prettier . --check",
		"format:write": "bunx prettier . --write",
		"test": "bunx vitest run",
		"test:watch": "bunx vitest",
		"prepare": "husky",
		"db:generate": "bunx prisma generate",
		"db:migrate": "bunx prisma migrate dev",
		"db:push": "bunx prisma db push",
		"db:studio": "bunx prisma studio"
	},
	"dependencies": {
		"@hookform/resolvers": "latest",
		"@prisma/client": "latest",
		"@supabase/supabase-js": "latest",
		"@tanstack/react-query": "latest",
		"better-auth": "latest",
		"class-variance-authority": "latest",
		"clsx": "latest",
		"lottie-react": "latest",
		"lucide-react": "latest",
		"next": "^16.1.6",
		"next-themes": "latest",
		"react": "^19.2.0",
		"react-dom": "^19.2.0",
		"react-hook-form": "latest",
		"tailwind-merge": "latest",
		"zod": "latest"
	},
	"devDependencies": {
		"@commitlint/cli": "latest",
		"@commitlint/config-conventional": "latest",
		"@tailwindcss/postcss": "^4",
		"@testing-library/jest-dom": "latest",
		"@testing-library/react": "latest",
		"@types/node": "^20",
		"@types/react": "^19",
		"@types/react-dom": "^19",
		"eslint": "^9",
		"eslint-config-next": "^16.1.6",
		"eslint-config-prettier": "latest",
		"husky": "latest",
		"jsdom": "latest",
		"lint-staged": "latest",
		"prettier": "latest",
		"prettier-plugin-tailwindcss": "latest",
		"prisma": "latest",
		"shadcn": "latest",
		"tailwindcss": "^4",
		"typescript": "^5",
		"vitest": "latest"
	},
	"lint-staged": {
		"*.{ts,tsx,js,jsx}": [
			"bunx eslint --fix",
			"bunx prettier --write"
		],
		"*.{json,md,css}": [
			"bunx prettier --write"
		]
	},
	"commitlint": {
		"extends": [
			"@commitlint/config-conventional"
		]
	}
}
```

### 2. prisma/schema.prisma

```prisma
generator client {
	provider = "prisma-client-js"
}

datasource db {
	provider  = "postgresql"
	url       = env("DATABASE_URL")
	directUrl = env("DIRECT_URL")
}

enum Role {
	paciente
	profissional
}

enum TipoChamada {
	normal
	urgente
}

enum StatusAtendimento {
	aguardando
	finalizado
}

model User {
	id            String         @id @default(cuid())
	name          String
	email         String         @unique
	emailVerified Boolean        @default(false)
	image         String?
	cpf           String         @unique
	role          Role           @default(paciente)
	ultimoAcesso  DateTime?
	createdAt     DateTime       @default(now())
	updatedAt     DateTime       @updatedAt
	sessions      Session[]
	accounts      Account[]
	atendimentos  Atendimento[]
}

model Session {
	id        String   @id @default(cuid())
	expiresAt DateTime
	token     String   @unique
	ipAddress String?
	userAgent String?
	userId    String
	createdAt DateTime @default(now())
	updatedAt DateTime @updatedAt
	user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

	@@index([userId])
}

model Account {
	id                    String    @id @default(cuid())
	accountId             String
	providerId            String
	userId                String
	accessToken           String?   @db.Text
	refreshToken          String?   @db.Text
	idToken               String?   @db.Text
	accessTokenExpiresAt  DateTime?
	refreshTokenExpiresAt DateTime?
	scope                 String?
	password              String?
	createdAt             DateTime  @default(now())
	updatedAt             DateTime  @updatedAt
	user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

	@@unique([providerId, accountId])
	@@index([userId])
}

model Verification {
	id         String   @id @default(cuid())
	identifier String
	value      String
	expiresAt  DateTime
	createdAt  DateTime @default(now())
	updatedAt  DateTime @updatedAt

	@@unique([identifier, value])
	@@index([identifier])
}

model Atendimento {
	id           String             @id @default(cuid())
	pacienteId   String
	tipoChamada  TipoChamada        @default(normal)
	status       StatusAtendimento  @default(aguardando)
	criadoEm     DateTime           @default(now())
	finalizadoEm DateTime?
	paciente     User               @relation(fields: [pacienteId], references: [id], onDelete: Cascade)

	@@index([pacienteId])
	@@index([status, criadoEm])
}
```

### 3. src/lib/auth.ts

```ts
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}

export const auth = betterAuth({
	appName: "re-attendant-bot",
	basePath: "/api/auth",
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},
	user: {
		modelName: "User",
		additionalFields: {
			cpf: {
				type: "string",
				required: true,
				unique: true,
			},
			role: {
				type: "string",
				required: false,
				defaultValue: "paciente",
				input: false,
			},
			ultimoAcesso: {
				type: "date",
				required: false,
				input: false,
			},
		},
	},
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
```

### 4. src/lib/supabase-client.ts

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Variaveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY sao obrigatorias.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
	},
	realtime: {
		params: {
			eventsPerSecond: 10,
		},
	},
	global: {
		headers: {
			"x-application-name": "re-attendant-bot",
		},
	},
});
```

### 5. src/components/providers/query-provider.tsx

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

type QueryProviderProps = {
	children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 15_000,
						gcTime: 1000 * 60 * 30,
						retry: 1,
						refetchOnMount: false,
						refetchOnReconnect: false,
						refetchOnWindowFocus: false,
					},
					mutations: {
						retry: 0,
					},
				},
			}),
	);

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### 6. src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});

export const metadata: Metadata = {
	title: "re-attendant-bot",
	description: "Sistema de fila de atendimento com painel operacional e atualizacao em tempo real.",
};

type RootLayoutProps = Readonly<{
	children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
	return (
		<html lang="pt-BR" suppressHydrationWarning>
			<body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
				<ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
					<QueryProvider>{children}</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
```

## Observacoes de implementacao

- O arquivo `src/lib/auth.ts` acima inicializa o Prisma internamente para manter o exemplo autocontido. Na evolucao do projeto, o ideal e extrair isso para `src/lib/prisma.ts`.
- O uso de Realtime com Supabase deve invalidar ou atualizar o cache do TanStack Query de forma dirigida, evitando polling constante.
- O papel `role` deve ser validado tanto no lado do cliente quanto nas server actions e rotas protegidas.
- O grupo `src/app/api/auth/[...all]` deve expor o handler do BetterAuth no App Router.

## Proximos passos recomendados

1. Criar `src/lib/prisma.ts` e centralizar a instancia do PrismaClient.
2. Implementar a rota `src/app/api/auth/[...all]/route.ts` com o handler do BetterAuth.
3. Adicionar as primeiras server actions para criar, chamar e finalizar atendimentos.
4. Criar os hooks `useRealtimeQueue` e `useCampainha` integrados ao Supabase Realtime.
5. Estruturar os grupos de rota `(auth)`, `(painel)` e `(tablet)`.
