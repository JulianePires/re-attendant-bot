"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { LottieHandler } from "@/components/common/atoms/LottieHandler";

/**
 * Um loader de overlay global que é ativado automaticamente durante
 * qualquer busca de dados (fetching) ou mutação (mutating) do React Query.
 * Garante que o usuário tenha feedback visual de que uma operação
 * está em andamento em segundo plano.
 *
 * Nota: O componente sempre chama os hooks (para evitar o erro "Rendered fewer hooks than expected"),
 * e controla a visibilidade via atributo hidden e pointer-events-none.
 */
export function GlobalOverlayLoader() {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();
  const isBusy = fetchingCount > 0 || mutatingCount > 0;

  return (
    <div
      hidden={!isBusy}
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-live="polite"
      aria-busy={isBusy}
    >
      <div
        className="pointer-events-none h-48 w-48"
        role="status"
        aria-label="Processando solicitação"
      >
        <LottieHandler animationName="loader" />
      </div>
    </div>
  );
}
