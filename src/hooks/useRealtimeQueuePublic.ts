"use client";

/**
 * Hook de Real-time PÚBLICO para Tela da TV
 * Similar ao useRealtimeQueue, mas:
 * - Usa query key separada (filaPublica)
 * - Não requer autenticação
 * - Dispara evento de áudio quando há nova inserção
 */

import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const FILA_PUBLICA_QUERY_KEY = ["filaPublica"];

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

type RealtimeCallbacks = {
  onNewPatient?: (payload: RealtimePayload) => void;
};

/**
 * Hook para sincronização em tempo real da fila pública (TV)
 * Implementa atualização otimista e callbacks para áudio
 */
export function useRealtimeQueuePublic(callbacks?: RealtimeCallbacks) {
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

    const upsertAtendimentoNaFila = (novo: Partial<RealtimePayload>, eventType?: string) => {
      if (!novo.id) {
        console.warn("⚠️ Payload sem ID, ignorando atualização:", novo);
        return;
      }

      const atendimentoId = novo.id;

      queryClient.setQueryData<RealtimeAtendimento[]>(FILA_PUBLICA_QUERY_KEY, (oldData = []) => {
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

        // Dispara callback quando é um INSERT
        if (eventType === "INSERT" && callbacks?.onNewPatient) {
          callbacks.onNewPatient(novo as RealtimePayload);
        }

        return ordenarFila([atendimentoOtimista, ...semItem]);
      });
    };

    const channel = supabase
      .channel("fila-publica-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "atendimento",
        },
        (payload) => {
          console.log(`🔴 [TV Realtime] ${payload.eventType}:`, payload.new);
          upsertAtendimentoNaFila(payload.new as RealtimePayload, payload.eventType);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ [TV] Conectado ao Supabase Realtime (fila pública)");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("❌ [TV] Erro na conexão Realtime:", status);
        }
      });

    return () => {
      channel.unsubscribe();
      console.log("🔌 [TV] Realtime desconectado");
    };
  }, [queryClient, callbacks]);
}
