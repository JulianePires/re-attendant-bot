"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { LottieHandler } from "@/components/common/atoms/LottieHandler";

/**
 * Loader de progresso visual com dois modos:
 * - Primeira carga real (isPending): overlay completo com Lottie para bloquear interação.
 * - Refetch em background / mutação: barra de progresso fina no topo da página,
 *   sem bloquear a UI — o usuário continua interagindo normalmente.
 *
 * Para distinguir "primeira carga" de "refetch silencioso" usamos o contador de
 * fetches assíncrono (`useIsFetching`) + uma flag injetada nos componentes que
 * precisam de overlay (via `meta.showOverlay` na query config, se necessário).
 *
 * Estratégia adotada: só exibe o overlay completo em mutações. Refetches exibem
 * apenas a barra sutil no topo. Isso elimina o overlay invasivo em refetches
 * de background do Realtime sem perder feedback visual.
 */
export function GlobalOverlayLoader() {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();

  const isMutating = mutatingCount > 0;
  const isRefetching = fetchingCount > 0 && !isMutating;

  return (
    <>
      {/* Barra de progresso sutil no topo — visível apenas em refetches em background */}
      {isRefetching && (
        <div
          role="progressbar"
          aria-label="Atualizando dados..."
          className="fixed top-0 right-0 left-0 z-50 h-0.5 overflow-hidden bg-transparent"
        >
          <div className="animate-progress-bar h-full bg-violet-500/70" />
        </div>
      )}

      {/* Overlay completo — exibido APENAS durante mutações (ações do usuário) */}
      <div
        hidden={!isMutating}
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        aria-live="polite"
        aria-busy={isMutating}
      >
        <div
          className="pointer-events-none h-48 w-48"
          role="status"
          aria-label="Processando solicitação"
        >
          <LottieHandler animationName="loader" />
        </div>
      </div>
    </>
  );
}
