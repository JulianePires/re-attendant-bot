# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Clinic self-service kiosk + real-time queue management (Next.js 16 App Router, React 19, TypeScript strict). Code, comments, identifiers and UI text are in **Portuguese (pt-BR)** — keep new code consistent (e.g. `nomePaciente`, `tipoChamada`, `criadoEm`).

## Commands

Package manager is **pnpm** (pinned via `packageManager` in `package.json`; `pnpm-lock.yaml`). Packages allowed to run install scripts are listed in `pnpm.onlyBuiltDependencies`. If you add a dependency that needs a postinstall step, add it there.

```bash
pnpm dev                  # next dev --turbopack
pnpm build                # prisma generate && next build
pnpm lint / pnpm lint:fix # ESLint 9
pnpm format:check         # Prettier (with tailwind plugin)
pnpm type-check           # tsc --noEmit
pnpm test                 # Vitest (watch); `pnpm test run` for a single pass
pnpm test src/hooks/useRealtimeQueue.test.tsx   # single file
pnpm test -t "nome do teste"                    # by test name

pnpm podman:up            # local Postgres via docker-compose (podman)
pnpm db:push              # apply schema without migration (dev)
pnpm db:migrate           # create versioned migration in prisma/migrations
pnpm db:generate          # regenerate client after schema changes
pnpm db:seed              # prisma/seed.ts via tsx (creates default admin if DB is empty)
```

Tests: Vitest + jsdom + Testing Library, globals enabled, setup in `src/test/setup.ts`, files `src/**/*.{test,spec}.{ts,tsx}`, `@/` → `src/`.

Git hooks: pre-commit runs `lint-staged` (eslint --fix + prettier); commit-msg runs commitlint — Conventional Commits with types `feat|fix|docs|style|refactor|test|chore|ci|perf|revert`, **lower-case subject**, header ≤ 100 chars (e.g. `feat(monitor): ...`).

## Architecture

### Interfaces / routes (`src/lib/constants.ts` → `APP_ROUTES`)

- `/recepcao` — patient kiosk (tablet). `KioskInteractionFlow` drives the flow; patient types a name and joins the queue as `normal` or `urgente`. Public.
- `/tv`, `/monitor` — public waiting-room displays (realtime, TTS/sound on new patient, wake lock + fullscreen). Public.
- `/adm/*` — staff panel (dashboard, `historico`, `usuarios`, `equipe`), `/adm/login`. Legacy `/painel/*` URLs redirect to `/adm/*`.
- `/esqueci-a-senha`, `/redefinir-senha` — password reset (only for unauthenticated users).

### Auth (BetterAuth)

- `src/lib/auth.ts` is server-only; `src/lib/auth-client.ts` for client components; handler at `src/app/api/auth/[...all]/route.ts`.
- Route protection lives in `src/proxy.ts` (Next 16's replacement for `middleware.ts`), with a `matcher` limited to `/adm`, `/painel`, and reset routes. It only checks authentication; **admin-role checks are done server-side in pages/server actions** (e.g. `src/app/adm/usuarios/page.tsx`, `src/server/actions/usuarios.ts`) by comparing `session.user.role` lower-cased.
- Roles: `admin` and `profissional` (see `Role` in `src/types/index.ts`). Patients are **not** users — `Atendimento` stores `nomePaciente` directly. `cpf` is an additional user field with `returned: false` (never exposed in client sessions).
- `experimental.authInterrupts` is on (`forbidden()` → `src/app/forbidden.tsx`).

### Data flow

- **Writes/reads go through Server Actions** in `src/server/actions/*` using Prisma (`src/lib/prisma.ts` singleton). Zod schemas in `src/types/index.ts` / `src/lib/validations/schemas.ts` are shared between forms and actions.
- **Realtime**: the Supabase client (`src/lib/supabase-client.ts`, browser, anon key) is used _only_ to subscribe to `postgres_changes` on the `atendimento` table — never for queries. Hooks `useRealtimeQueue` (staff, query keys `filaAtiva`/`atendimentosDia`) and `useRealtimeQueuePublic` (TV/monitor, `filaPublica`) patch the TanStack Query cache optimistically, keep urgent-first then FIFO ordering, and invalidate for refetch. Public read access relies on Supabase RLS policies described in `INSTRUÇÕES_RLS_TV.md`.
- Creating an `Atendimento` also creates `Notificacao` rows for every `profissional`/`admin` (consumed by `NotificationBell` / `useNotificationListener`).

### Domain model (`prisma/schema.prisma`)

- `Atendimento`: `status` `aguardando → finalizado`, `tipoChamada` `normal|urgente` (plain strings, constants in `src/types/index.ts`), `arquivadoTurno` flag, optional unique `consultaHash` (SHA-256 of the CRM `consulta_id`, never the raw id — the public TV reads this table; ADR 0004). Patients confirmed on the CRM test kiosk enter the queue via `src/server/fila.ts` (`server-only`, deliberately not a Server Action).
- **Shifts (turnos)**: `src/lib/utils/turnos.ts` defines manhã (06–12), tarde (12–18), noite. The active queue/day views are scoped to the current shift, and "closing" a shift sets `arquivadoTurno = true` rather than deleting rows.
- BetterAuth tables use `@@map` to lowercase table names (`user`, `session`, …).

### Email

`src/lib/email/` — nodemailer SMTP service + templates + a BetterAuth adapter used by `sendResetPassword`/`onPasswordReset` in `auth.ts`. Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`. See `src/lib/email/README.md`.

### UI

Tailwind v4 + shadcn (`src/components/ui`, generated via CLI — `components.json`). Feature components are organized as atoms/molecules/organisms under `src/components/{common,dashboard}`, plus `tablet/` (kiosk) and `painel/` (staff shell). React Compiler is enabled (`reactCompiler: true`), so manual `useMemo`/`useCallback` is usually unnecessary.

## Environment & deploy

Env vars: `DATABASE_URL` (Supabase pooler, port 6543, `pgbouncer=true`), `DIRECT_URL` (port 5432, for migrations), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, plus the SMTP vars above. `supabase-client.ts` throws at import if the Supabase vars are missing.

Deployed on **Vercel** (no `vercel.json`; defaults with pnpm detected from the lockfile, build = `pnpm build`). Env vars are set in the Vercel project. Migrations are **not** run in the build, so apply them with `pnpm exec prisma migrate deploy` against `DIRECT_URL` when you ship a schema change. Allowed origins for auth are hard-coded in `trustedOrigins` in `src/lib/auth.ts`; add new domains there.
