"use client";

/**
 * Chaves de query para o React Query
 * Utilizadas para invalidação e caching em operações realtime
 */
export const FILA_ATIVA_QUERY_KEY = ["filaAtiva"];
export const ATENDIMENTOS_DIA_QUERY_KEY = ["atendimentosDia"];

import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type RealtimeAtendimento = {
  id: string;
  pacienteId: string;
  tipoChamada: string;
  criadoEm: string;
  paciente: {
    id: string;
    name: string;
  };
};

type RealtimeInsertPayload = {
  id: string;
  pacienteId: string;
  tipoChamada: string;
  criadoEm: string;
};

/**
 * Hook para sincronização em tempo real da fila de atendimento
 * via Supabase Realtime usando postgres_changes
 *
 * Implementa:
 * - Atualização otimista imediata no cache do React Query
 * - Invalidação silenciosa para refetch com dados completos (JOINs)
 * - Ordenação automática (urgentes primeiro, depois por data)
 * - Cleanup automático ao desmontar
 */
export function useRealtimeQueue() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Inscreve-se em INSERTs na tabela Atendimento
    // Nota: Apenas novos atendimentos disparam este evento
    const channel = supabase
      .channel("atendimentos_fila_sync")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "atendimento",
        },
        (payload) => {
          const novoAtendimento = payload.new as Partial<RealtimeInsertPayload>;

          // Validação defensiva
          if (!novoAtendimento || !novoAtendimento.id || !novoAtendimento.pacienteId) {
            console.warn("⚠️ Recebido payload inválido do Realtime:", payload);
            return;
          }

          const atendimentoId = novoAtendimento.id;
          const pacienteId = novoAtendimento.pacienteId;

          // Atualização Otimista: Injeta instantaneamente a novo atendimento no cache
          // Usar setQueryData evita delay de rede durante refetch
          queryClient.setQueryData<RealtimeAtendimento[]>(FILA_ATIVA_QUERY_KEY, (oldData = []) => {
            if (!Array.isArray(oldData)) {
              return oldData;
            }

            // Evita duplicação: verifica se já existe este ID
            const jaExiste = oldData.some((att) => att.id === novoAtendimento.id);
            if (jaExiste) {
              console.info("ℹ️ Atendimento já existe no cache, pulando duplicação");
              return oldData;
            }

            // Cria placeholder com paciente em sincronização
            const atendimentoOtimista: RealtimeAtendimento = {
              id: atendimentoId,
              pacienteId,
              tipoChamada: novoAtendimento.tipoChamada ?? "normal",
              criadoEm: novoAtendimento.criadoEm ?? new Date().toISOString(),
              paciente: {
                id: pacienteId,
                name: "Sincronizando dados...",
              },
            };

            // Insere no topo da lista
            const novaLista = [atendimentoOtimista, ...oldData];

            // Re-aplica ordenação: Urgentes primeiro, depois ordenados por data criação
            return novaLista.sort((a, b) => {
              // Urgentes sempre no topo
              if (a.tipoChamada === "URGENTE" && b.tipoChamada !== "URGENTE") return -1;
              if (b.tipoChamada === "URGENTE" && a.tipoChamada !== "URGENTE") return 1;

              // Se mesmo tipo, ordena por data (mais antigos primeiro)
              const dataA = new Date(a.criadoEm).getTime();
              const dataB = new Date(b.criadoEm).getTime();
              return dataA - dataB;
            });
          });

          // Refetch silencioso em background para obter JOINs completos (dados do paciente, etc)
          // O usuário vê resultado otimista imediatamente, depois vê dados precisos conforme chegam
          queryClient.invalidateQueries({ queryKey: FILA_ATIVA_QUERY_KEY });
          queryClient.invalidateQueries({
            queryKey: ATENDIMENTOS_DIA_QUERY_KEY,
          });

          console.info("✅ Novo atendimento recebido em tempo real:", novoAtendimento.id);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("🔔 Sincronização realtime da fila ativada");
        }
      });

    // Cleanup: Remove inscrição ao desmontar o hook
    return () => {
      supabase.removeChannel(channel);
      console.info("🔕 Sincronização realtime da fila removida");
    };
  }, [queryClient]);
}
