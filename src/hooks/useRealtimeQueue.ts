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
  status?: string;
  criadoEm: string;
  finalizadoEm?: string | null;
  paciente: {
    id: string;
    name: string;
  };
};

type RealtimePayload = {
  id: string;
  pacienteId: string;
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
      if (!novo.id || !novo.pacienteId) {
        return;
      }

      const atendimentoId = novo.id;
      const pacienteId = novo.pacienteId;

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
          pacienteId,
          tipoChamada: normalizarTipoChamada(novo.tipoChamada),
          status,
          criadoEm: novo.criadoEm ?? new Date().toISOString(),
          finalizadoEm: novo.finalizadoEm ?? null,
          paciente: {
            id: pacienteId,
            name: "Sincronizando dados...",
          },
        };

        return ordenarFila([atendimentoOtimista, ...semItem]);
      });
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

    const sincronizarQueries = () => {
      queryClient.invalidateQueries({ queryKey: FILA_ATIVA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATENDIMENTOS_DIA_QUERY_KEY });
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
          const novoAtendimento = payload.new as Partial<RealtimePayload>;
          if (!novoAtendimento?.id || !novoAtendimento?.pacienteId) {
            console.warn("⚠️ Payload INSERT inválido no Realtime:", payload);
            return;
          }

          upsertAtendimentoNaFila(novoAtendimento);
          sincronizarQueries();
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
          const atendimentoAtualizado = payload.new as Partial<RealtimePayload>;
          if (!atendimentoAtualizado?.id) {
            console.warn("⚠️ Payload UPDATE inválido no Realtime:", payload);
            return;
          }

          upsertAtendimentoNaFila(atendimentoAtualizado);
          sincronizarQueries();
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
          const removido = payload.old as Partial<RealtimePayload>;
          removerAtendimentoDaFila(removido?.id);
          sincronizarQueries();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Garante hidratação inicial do painel sem depender de refresh manual.
          sincronizarQueries();
          console.info("🔔 Sincronização realtime da fila ativada");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      console.info("🔕 Sincronização realtime da fila removida");
    };
  }, [queryClient]);
}
