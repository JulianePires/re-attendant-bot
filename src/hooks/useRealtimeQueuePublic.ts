"use client";

/**
 * Hook de Real-time PÚBLICO para Tela da TV
 * Similar ao useRealtimeQueue, mas:
 * - Usa query key separada (filaPublica)
 * - Não requer autenticação
 * - Dispara evento de áudio quando há nova inserção (INSERT)
 * - Separação de eventos INSERT/UPDATE/DELETE para sincronização correta
 */

import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

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
 * Implementa atualização otimista e callbacks para áudio.
 *
 * CORRIGIDO:
 * - callbacks armazenado em ref → sem re-subscribe em cada render
 * - Eventos DELETE tratados via payload.old (payload.new é {} em deletes)
 * - INSERT/UPDATE/DELETE separados por handler dedicado
 */
export function useRealtimeQueuePublic(callbacks?: RealtimeCallbacks) {
  const queryClient = useQueryClient();

  // Ref garante que o callback sempre aponta para a versão mais recente
  // sem precisar recriar o canal do Supabase a cada render.
  const callbacksRef = useRef<RealtimeCallbacks | undefined>(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    const normalizarTipoChamada = (tipo?: string) => (tipo ?? "normal").toLowerCase();

    const ordenarFila = (lista: RealtimeAtendimento[]) =>
      [...lista].sort((a, b) => {
        const aUrgente = normalizarTipoChamada(a.tipoChamada) === "urgente";
        const bUrgente = normalizarTipoChamada(b.tipoChamada) === "urgente";
        if (aUrgente && !bUrgente) return -1;
        if (!aUrgente && bUrgente) return 1;
        return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
      });

    const handleInsert = (novo: RealtimePayload) => {
      // Atualização otimista imediata — garante que o item aparece na UI sem esperar o refetch
      queryClient.setQueryData<RealtimeAtendimento[]>(FILA_PUBLICA_QUERY_KEY, (oldData = []) => {
        if (!Array.isArray(oldData)) return oldData;

        const atendimentoOtimista: RealtimeAtendimento = {
          id: novo.id,
          // Supabase Realtime pode não incluir todos os campos no payload (ex.: com RLS ativo).
          // Se nomePaciente vier vazio, o refetch abaixo corrige com os dados reais do servidor.
          nomePaciente: novo.nomePaciente || "...",
          tipoChamada: normalizarTipoChamada(novo.tipoChamada),
          status: (novo.status ?? "aguardando").toLowerCase(),
          criadoEm: novo.criadoEm ?? new Date().toISOString(),
          finalizadoEm: novo.finalizadoEm ?? null,
        };

        const semDuplicata = oldData.filter((att) => att.id !== novo.id);
        return ordenarFila([atendimentoOtimista, ...semDuplicata]);
      });

      // Refetch em background para substituir o dado otimista com a versão
      // completa do servidor — corrige casos onde o payload do Realtime
      // chega com campos ausentes/nulos.
      queryClient.invalidateQueries({ queryKey: FILA_PUBLICA_QUERY_KEY });

      // Disparar áudio via ref (sem closure stale)
      callbacksRef.current?.onNewPatient?.(novo);
    };

    const handleUpdate = (atualizado: Partial<RealtimePayload>) => {
      if (!atualizado.id) return;
      const id = atualizado.id;

      queryClient.setQueryData<RealtimeAtendimento[]>(FILA_PUBLICA_QUERY_KEY, (oldData = []) => {
        if (!Array.isArray(oldData)) return oldData;

        const status = (atualizado.status ?? "aguardando").toLowerCase();
        const semItem = oldData.filter((att) => att.id !== id);

        // Status diferente de aguardando → remove da fila pública imediatamente
        if (status !== "aguardando") return semItem;

        // Preserva nome já existente no cache caso o payload chegue sem ele
        const existente = oldData.find((att) => att.id === id);
        const atualizedItem: RealtimeAtendimento = {
          id,
          nomePaciente: atualizado.nomePaciente || existente?.nomePaciente || "...",
          tipoChamada: normalizarTipoChamada(atualizado.tipoChamada),
          status,
          criadoEm: atualizado.criadoEm ?? existente?.criadoEm ?? new Date().toISOString(),
          finalizadoEm: atualizado.finalizadoEm ?? null,
        };

        return ordenarFila([atualizedItem, ...semItem]);
      });

      // Refetch em background para garantir dados completos do servidor
      queryClient.invalidateQueries({ queryKey: FILA_PUBLICA_QUERY_KEY });
    };

    const handleDelete = (removido: Partial<RealtimePayload>) => {
      if (!removido.id) return;
      queryClient.setQueryData<RealtimeAtendimento[]>(FILA_PUBLICA_QUERY_KEY, (oldData = []) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter((att) => att.id !== removido.id);
      });
    };

    const channel = supabase
      .channel("fila-publica-realtime-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atendimento" },
        (payload) => {
          console.info("🆕 [TV] INSERT:", payload.new);
          handleInsert(payload.new as RealtimePayload);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atendimento" },
        (payload) => {
          console.info("🔄 [TV] UPDATE:", payload.new);
          handleUpdate(payload.new as Partial<RealtimePayload>);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "atendimento" },
        (payload) => {
          console.info("🗑️ [TV] DELETE:", payload.old);
          // DELETE: payload.new é {} — usar payload.old
          handleDelete(payload.old as Partial<RealtimePayload>);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("✅ [TV] Conectado ao Supabase Realtime (fila pública)");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("❌ [TV] Erro na conexão Realtime:", status);
          // Força refetch como fallback em caso de erro de conexão
          queryClient.invalidateQueries({ queryKey: FILA_PUBLICA_QUERY_KEY });
        }
      });

    return () => {
      channel.unsubscribe();
      console.info("🔌 [TV] Realtime desconectado");
    };
    // Intencionalmente não inclui `callbacks` — usamos ref para evitar re-subscribe
  }, [queryClient]);
}
