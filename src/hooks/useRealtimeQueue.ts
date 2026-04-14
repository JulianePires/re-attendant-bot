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

/**
 * ATUALIZADO: Removido pacienteId, agora usa nomePaciente direto
 * Reflete a refatoração do schema onde Atendimento não tem mais FK para User
 */
type RealtimeAtendimento = {
  id: string;
  nomePaciente: string;
  tipoChamada: string;
  status?: string;
  criadoEm: string;
  finalizadoEm?: string | null;
};

type RealtimePayload = {
  id: string;
  nomePaciente: string;
  tipoChamada: string;
  status?: string;
  criadoEm: string;
  finalizadoEm?: string | null;
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
    const normalizarTipoChamada = (tipo?: string) => (tipo ?? "normal").toLowerCase();

    const ordenarFila = (lista: RealtimeAtendimento[]) => {
      return [...lista].sort((a, b) => {
        const aUrgente = normalizarTipoChamada(a.tipoChamada) === "urgente";
        const bUrgente = normalizarTipoChamada(b.tipoChamada) === "urgente";

        if (aUrgente && !bUrgente) return -1;
        if (!aUrgente && bUrgente) return 1;

        const dataA = new Date(a.criadoEm).getTime();
        const dataB = new Date(b.criadoEm).getTime();
        return dataA - dataB;
      });
    };

    const upsertAtendimentoNaFila = (novo: Partial<RealtimePayload>) => {
      if (!novo.id) {
        console.warn("⚠️ Payload sem ID, ignorando atualização:", novo);
        return;
      }

      const atendimentoId = novo.id;

      queryClient.setQueryData<RealtimeAtendimento[]>(FILA_ATIVA_QUERY_KEY, (oldData = []) => {
        if (!Array.isArray(oldData)) {
          return oldData;
        }

        const status = (novo.status ?? "aguardando").toLowerCase();
        const semItem = oldData.filter((att) => att.id !== atendimentoId);

        // Se não estiver aguardando, remove da fila ativa.
        if (status !== "aguardando") {
          return semItem;
        }

        const atendimentoOtimista: RealtimeAtendimento = {
          id: atendimentoId,
          nomePaciente: novo.nomePaciente || "Sincronizando...",
          tipoChamada: normalizarTipoChamada(novo.tipoChamada),
          status,
          criadoEm: novo.criadoEm ?? new Date().toISOString(),
          finalizadoEm: novo.finalizadoEm ?? null,
        };

        return ordenarFila([atendimentoOtimista, ...semItem]);
      });

      // REMOVIDO: invalidateQueries com refetchType: 'active'
      // A atualização otimista via setQueryData já atualiza a UI
      // Refetch completo só é necessário em casos específicos
    };

    const removerAtendimentoDaFila = (atendimentoId?: string) => {
      if (!atendimentoId) {
        return;
      }

      queryClient.setQueryData<RealtimeAtendimento[]>(FILA_ATIVA_QUERY_KEY, (oldData = []) => {
        if (!Array.isArray(oldData)) {
          return oldData;
        }

        return oldData.filter((att) => att.id !== atendimentoId);
      });
    };

    // OTIMIZADO: Sincronização leve - apenas ATENDIMENTOS_DIA_QUERY_KEY quando necessário
    const sincronizarHistorico = () => {
      queryClient.invalidateQueries({
        queryKey: ATENDIMENTOS_DIA_QUERY_KEY,
        refetchType: "none", // Não força refetch imediato
      });
    };

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
          console.info("🆕 INSERT recebido do Supabase Realtime:", payload.new);
          const novoAtendimento = payload.new as Partial<RealtimePayload>;

          if (!novoAtendimento?.id) {
            console.warn("⚠️ Payload INSERT inválido (sem ID):", payload);
            return;
          }

          upsertAtendimentoNaFila(novoAtendimento);
          // Não precisa invalidar - setQueryData já atualizou a UI
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "atendimento",
        },
        (payload) => {
          console.info("🔄 UPDATE recebido do Supabase Realtime:", payload.new);
          const atendimentoAtualizado = payload.new as Partial<RealtimePayload>;

          if (!atendimentoAtualizado?.id) {
            console.warn("⚠️ Payload UPDATE inválido (sem ID):", payload);
            return;
          }

          upsertAtendimentoNaFila(atendimentoAtualizado);
          // Atualiza histórico apenas quando atendimento é finalizado
          if (atendimentoAtualizado.status !== "aguardando") {
            sincronizarHistorico();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "atendimento",
        },
        (payload) => {
          console.info("🗑️ DELETE recebido do Supabase Realtime:", payload.old);
          const removido = payload.old as Partial<RealtimePayload>;
          removerAtendimentoDaFila(removido?.id);
          sincronizarHistorico();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("✅ Canal Supabase SUBSCRIBED");
          // REMOVIDO: sincronizarQueries() inicial
          // A query inicial já é feita pelo useQuery no componente
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Erro no canal Supabase Realtime");
        } else if (status === "TIMED_OUT") {
          console.error("⏰ Timeout na conexão Supabase Realtime");
        }
      });

    // CRÍTICO: Cleanup correto para evitar vazamento de memória
    // O canal é removido quando o componente desmonta, mas mantém conexão ativa durante ciclo de vida
    return () => {
      supabase
        .removeChannel(channel)
        .then(() => {
          console.info("🔕 Canal Supabase removido com sucesso");
        })
        .catch((error) => {
          console.error("❌ Erro ao remover canal:", error);
        });
    };
  }, [queryClient]);
}
