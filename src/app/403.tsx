"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, Home } from "lucide-react";

/**
 * Página de erro 403 - Acesso Negado
 * Mostrada quando usuário não possui permissão para acessar recurso
 */

export default function Forbidden() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-950 p-4 text-zinc-100">
      {/* Decorações visuais */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-red-900/10 via-zinc-950 to-zinc-950"></div>
      <div className="pointer-events-none absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-red-600/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute -right-[10%] -bottom-[20%] h-[50%] w-[50%] rounded-full bg-orange-600/10 blur-[120px]"></div>

      <div className="relative z-10 w-full max-w-md animate-in text-center duration-500 zoom-in-95 fade-in">
        {/* Ícone de erro */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <Lock className="h-12 w-12 text-red-400" />
        </div>

        {/* Conteúdo */}
        <h1 className="mb-2 text-5xl font-bold text-white">403</h1>
        <p className="mb-2 text-xl font-semibold text-zinc-300">Acesso Negado</p>
        <p className="mx-auto mb-8 max-w-sm text-sm text-zinc-400">
          Você não possui permissão para acessar este recurso. Apenas administradores podem acessar
          esta página.
        </p>

        {/* Botões de ação */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => router.push("/adm")}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-6 py-2 text-white transition-colors hover:bg-zinc-700"
          >
            <Home className="h-4 w-4" />
            Voltar ao Admin
          </Button>

          <Button
            onClick={() => router.back()}
            className="rounded-lg border border-red-500/20 bg-red-600/20 px-6 py-2 text-red-300 transition-colors hover:bg-red-600/30"
          >
            Voltar
          </Button>
        </div>

        {/* Mensagem adicional */}
        <p className="mt-8 text-xs text-zinc-500">
          Se você acredita que deveria ter acesso, entre em contato com um administrador.
        </p>
      </div>
    </div>
  );
}
