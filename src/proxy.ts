import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { APP_ROUTES } from "./lib/constants";

/**
 * Middleware de autenticação e autorização
 * Valida sessão via BetterAuth e protege rotas admin
 *
 * Proteções implementadas:
 * - /adm/usuarios/novo - Apenas admin
 * - /adm/* - Autenticado
 * - /esqueci-a-senha, /redefinir-senha - Apenas não autenticado
 */

// Rotas protegidas por role RBAC
const ADMIN_ONLY_ROUTES = [APP_ROUTES.EQUIPE, APP_ROUTES.USUARIOS];

// Rotas protegidas (requer autenticação)
const PROTECTED_ROUTES = [
  APP_ROUTES.DASHBOARD,
  APP_ROUTES.HISTORICO,
  APP_ROUTES.NOVO_USUARIO,
  APP_ROUTES.CONFIGURACOES,
];

// Rotas públicas para não autenticados (redireciona se já autenticado)
const PUBLIC_ONLY_ROUTES = [APP_ROUTES.ESQUECI_SENHA, APP_ROUTES.REDEFINIR_SENHA, APP_ROUTES.LOGIN];

// Rotas totalmente públicas (sem redirecionamento mesmo autenticado)
const FULLY_PUBLIC_ROUTES = [APP_ROUTES.TV, APP_ROUTES.PUBLICO_ATENDIMENTOS, APP_ROUTES.TOTEM];

function matchRoute(pathname: string, route: string) {
  if (route === "/") {
    return pathname === "/";
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/painel" || pathname.startsWith("/painel/")) {
    const destino = pathname.replace(/^\/painel/, "/adm");
    return NextResponse.redirect(new URL(destino, request.url));
  }

  // Rotas totalmente públicas (sem verificação de sessão)
  if (FULLY_PUBLIC_ROUTES.some((route) => matchRoute(pathname, route))) {
    return NextResponse.next();
  }

  // Validar sessão via auth
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role;

  // Rotas de ADMIN ONLY
  if (ADMIN_ONLY_ROUTES.some((route) => matchRoute(pathname, route))) {
    if (!isAuthenticated) {
      // Redireciona para login se não autenticado
      return NextResponse.redirect(new URL(APP_ROUTES.LOGIN, request.url));
    }
  }

  // Rotas PROTECTED (requer autenticação)
  if (PROTECTED_ROUTES.some((route) => matchRoute(pathname, route))) {
    // Exceção: login é público mesmo dentro de /adm
    if (pathname === APP_ROUTES.LOGIN) {
      if (isAuthenticated) {
        // Se já autenticado, redireciona para dashboard
        return NextResponse.redirect(new URL(APP_ROUTES.DASHBOARD, request.url));
      }
      return NextResponse.next();
    }

    // Outras rotas /adm/* requerem autenticação
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL(APP_ROUTES.LOGIN, request.url));
    }
  }

  // Rotas PUBLIC ONLY (redireciona autenticados)
  if (PUBLIC_ONLY_ROUTES.some((route) => matchRoute(pathname, route))) {
    if (isAuthenticated) {
      // Se já autenticado, redireciona para dashboard
      return NextResponse.redirect(new URL(APP_ROUTES.DASHBOARD, request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Matcher: aplica middleware só em rotas específicas
 * Evita overhead em assets estáticos e API routes
 */
export const config = {
  matcher: [
    // Protege rotas do admin e mantém compatibilidade com URLs legadas
    "/adm/:path*",
    "/painel/:path*",
    "/esqueci-a-senha",
    "/redefinir-senha",
    // Exclui:
    // - /_next (static files)
    // - /api (API routes - têm sua própria auth)
    // - /public (assets)
  ],
};
