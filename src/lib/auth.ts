import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";

// ================================================================
// INICIALIZAÇÃO DO BETTERAUTH
//
// Arquitetura de autenticação:
// - Este arquivo é SERVER ONLY (nunca importe em componentes client).
// - O handler HTTP é exposto em `src/app/api/auth/[...all]/route.ts`.
// - Para o lado cliente, crie `src/lib/auth-client.ts` com `createAuthClient()`.
// ================================================================

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "https://re-attendant-bot.vercel.app",
    "re-attendant-bot.vercel.app",
  ],

  // Autenticação por e-mail e senha como método primário do sistema.
  // Social providers (Google, etc.) podem ser adicionados aqui no futuro.
  emailAndPassword: {
    enabled: true,
    // Ativar verificação em produção após configurar o provider de e-mail
    requireEmailVerification: false,
  },

  plugins: [
    // ----------------------------------------------------------------
    // PLUGIN DE ADMIN — Gerenciamento de RBAC
    // O plugin adiciona e gerencia o campo `role` no model User.
    // - adminRole: usuários com este role têm acesso a rotas protegidas
    //              e às funções de gestão da fila (painel do profissional).
    // - defaultRole: atribuído automaticamente a todo novo cadastro.
    // ----------------------------------------------------------------
    admin({
      adminRole: "profissional",
      defaultRole: "paciente",
    }),
    nextCookies(),
  ],

  // Mapeamento dos campos customizados adicionados ao model User no schema.prisma.
  // O BetterAuth precisa conhecer esses campos para incluí-los nas sessões e
  // nas operações de criação/atualização de usuário.
  user: {
    additionalFields: {
      cpf: {
        type: "string",
        required: true,
        // CPF é dado sensível: não retornamos por padrão na sessão do cliente.
        // Para acessá-lo no servidor, use `auth.api.getSession({ headers })`.
        returned: false,
      },
      ultimoAcesso: {
        type: "date",
        required: false,
      },
    },
  },

  session: {
    // A sessão é renovada (cookie reescrito) a cada 1 hora de atividade,
    // mantendo o usuário logado sem exigir novo login a cada visita.
    updateAge: 60 * 60,
    // Sessão expira após 30 dias de inatividade total.
    expiresIn: 60 * 60 * 24 * 30,
  },

  // ================================================================
  // CONFIGURAÇÃO DE COOKIES - Segurança em Produção
  // ================================================================
  advanced: {
    useSecureCookies: isProduction,
    // Cookies com SameSite=Lax previnem CSRF enquanto mantém navegação funcional
    sameSite: "lax",
    requestIdHeader: "x-request-id",
  },
});

// Tipos inferidos para uso em Server Actions e Route Handlers.
// Facilita o acesso tipado sem depender de imports genéricos.
export type BetterAuthSession = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user;
