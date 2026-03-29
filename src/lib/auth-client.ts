import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// ================================================================
// CLIENTE DO BETTERAUTH — LADO DO BROWSER
//
// Este arquivo é CLIENT SAFE: pode ser importado em componentes
// e hooks do lado do cliente ("use client").
//
// Exporta hooks prontos para uso:
// - useSession()         → sessão reativa do usuário atual
// - signIn.email()       → login por e-mail/senha
// - signUp.email()       → cadastro com campos customizados
// - signOut()            → logout
// - $Infer.Session       → tipagem da sessão no cliente
// ================================================================

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    // Habilita funções administrativas no cliente (ex: verificar role do usuário).
    // Os métodos privilegiados como banUser() só funcionam para o role 'profissional'.
    adminClient(),
  ],
});

// Re-exporta os hooks para facilitar o import nos componentes
export const { useSession, signIn, signUp, signOut, getSession } = authClient;
