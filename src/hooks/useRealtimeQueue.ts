"use client";

import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AtendimentoNaFila } from "@/types";
import { supabase, CANAL_FILA } from "@/lib/supabase-client";
import { useCampainha } from "@/hooks/useCampainha";

export const FILA_ATIVA_QUERY_KEY = ["fila-ativa"] as const;
export const ATENDIMENTOS_DIA_QUERY_KEY = ["atendimentos-dia"] as const;

export function useRealtimeQueue(queryClient: QueryClient) {
  const { tocarAlertaUrgente, pararAlertaUrgente, tocarNotificacao } = useCampainha();

  useEffect(() => {
    const channel = supabase
      .channel(CANAL_FILA)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atendimento" },
        (payload) => {
          const novoAtendimento = payload.new as AtendimentoNaFila;

          queryClient.setQueryData<AtendimentoNaFila[]>(FILA_ATIVA_QUERY_KEY, (old = []) => {
            if (old.some((item) => item.id === novoAtendimento.id)) {
              return old;
            }

            const atualizada = [...old, novoAtendimento].sort(
              (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
            );

            return atualizada;
          });

          if (novoAtendimento.tipoChamada === "urgente") {
            tocarAlertaUrgente();
          } else {
            tocarNotificacao();
          }

          // Refetch garante dados relacionais (ex: nome do paciente) imediatamente.
          queryClient.invalidateQueries({ queryKey: FILA_ATIVA_QUERY_KEY });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atendimento" },
        (payload) => {
          const atendimentoAtualizado = payload.new as AtendimentoNaFila;

          if (atendimentoAtualizado.status === "finalizado") {
            let aindaTemUrgente = false;

            queryClient.setQueryData<AtendimentoNaFila[]>(FILA_ATIVA_QUERY_KEY, (old = []) => {
              const atualizada = old.filter((item) => item.id !== atendimentoAtualizado.id);
              aindaTemUrgente = atualizada.some((item) => item.tipoChamada === "urgente");
              return atualizada;
            });

            if (!aindaTemUrgente) {
              pararAlertaUrgente();
            }

            queryClient.invalidateQueries({ queryKey: ATENDIMENTOS_DIA_QUERY_KEY });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pararAlertaUrgente, queryClient, tocarAlertaUrgente, tocarNotificacao]);
}
