"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { criarQueryClient } from "@/lib/query-client";

// ================================================================
// PROVIDER DO TANSTACK QUERY
//
// O QueryClient é criado dentro do useState para garantir que cada
// sessão do usuário (e cada request no servidor durante hidratação)
// tenha uma instância isolada do cache — prevenindo vazamento de
// dados entre usuários diferentes em ambiente SSR.
// ================================================================

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => criarQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools visível apenas em desenvolvimento */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
