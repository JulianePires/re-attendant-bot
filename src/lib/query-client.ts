import { QueryClient } from "@tanstack/react-query";

// ================================================================
// CONFIGURAÇÃO DO QUERY CLIENT
//
// Exportamos uma factory function em vez de uma instância singleton
// porque o QueryClient é instanciado por sessão de usuário no
// QueryProvider (via useState), garantindo que cada request SSR
// tenha seu próprio cache isolado e evitando vazamento de dados
// entre requisições (problema clássico de singletons em SSR).
// ================================================================

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // --------------------------------------------------------
        // INTEGRAÇÃO COM SUPABASE REALTIME
        // Como as atualizações da fila chegam via WebSocket, o
        // refetch automático ao focar a janela seria redundante e
        // geraria chamadas desnecessárias ao banco.
        // --------------------------------------------------------
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Dados são considerados "frescos" por 30 segundos.
        // Após isso, o TanStack Query pode revalidar em background.
        staleTime: 30_000,
        // 1 retry evita falhas transitórias de rede sem ser agressivo.
        retry: 1,
        retryDelay: (tentativa) => Math.min(1000 * 2 ** tentativa, 10_000),
      },
      mutations: {
        // Erros de mutation devem ser tratados localmente (nos Server Actions).
        retry: 0,
      },
    },
  });
}
