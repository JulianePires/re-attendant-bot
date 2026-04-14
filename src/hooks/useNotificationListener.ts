"use client";

/**
 * Hook para gerenciar notificações em tempo real com suporte a áudio
 * Sincroniza com Supabase Realtime e reproduz alertas sonoros
 *
 * ATUALIZADO: Usa hook dedicado useNotificationSound para áudio robusto
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { obterResumoAtendimento } from "@/server/actions/atendimento";
import { TipoChamada, TipoChamadaValue } from "@/types";
import { ATENDIMENTOS_DIA_QUERY_KEY, FILA_ATIVA_QUERY_KEY } from "./useRealtimeQueue";
import { useNotificationSound } from "./useNotificationSound";

export function useNotificationListener() {
  const queryClient = useQueryClient();
  const playSound = useNotificationSound();

  useEffect(() => {
    // Listener para novos atendimentos na tabela
    const atendimentoChannel = supabase
      .channel("notificacoes_atendimentos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atendimento" },
        async (payload) => {
          console.info("🔔 Novo atendimento detectado via Realtime:", payload.new);

          const newAtendimento = payload.new as {
            id?: string;
            tipoChamada?: string;
            nomePaciente?: string;
          };

          const atendimentoId = newAtendimento.id;
          let nomePaciente = newAtendimento.nomePaciente || "Paciente";
          let tipoChamada =
            (newAtendimento.tipoChamada as TipoChamadaValue | undefined) ?? TipoChamada.NORMAL;

          // Busca dados completos do atendimento (fallback se necessário)
          if (atendimentoId && !newAtendimento.nomePaciente) {
            try {
              const resumo = await obterResumoAtendimento(atendimentoId);
              if (resumo) {
                nomePaciente = resumo.nomePaciente;
                tipoChamada = resumo.tipoChamada;
              }
            } catch (error) {
              console.warn("⚠️ Erro ao buscar resumo do atendimento:", error);
            }
          }

          // Toast visual e reprodução de áudio
          if (tipoChamada === TipoChamada.URGENTE) {
            toast.error(`🚨 URGENTE: ${nomePaciente}`, {
              description: "Atendimento prioritário aguardando",
              duration: 8000,
            });
            playSound("urgente");
          } else {
            toast.info(`Novo Paciente: ${nomePaciente}`, {
              description: "Adicionado à fila de atendimento",
            });
            playSound("normal");
          }

          // Invalidação agressiva de todas as queries relacionadas
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: FILA_ATIVA_QUERY_KEY,
              refetchType: "active",
            }),
            queryClient.invalidateQueries({
              queryKey: ATENDIMENTOS_DIA_QUERY_KEY,
              refetchType: "active",
            }),
            queryClient.invalidateQueries({ queryKey: ["notificacoes"], refetchType: "active" }),
          ]);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("✅ Listener de notificações ativado");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Erro no canal de notificações");
        }
      });

    // Listener específico para a tabela de notificações
    const notificacaoChannel = supabase
      .channel("notificacoes_diretas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacao" },
        (payload) => {
          console.info("🔔 Nova notificação criada no banco:", payload.new);

          // Invalidar e refetch imediato
          queryClient.invalidateQueries({
            queryKey: ["notificacoes"],
            refetchType: "active",
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("✅ Listener de notificações diretas ativado");
        }
      });

    // Cleanup: Remove ambos os canais ao desmontar
    return () => {
      supabase.removeChannel(atendimentoChannel).then(() => {
        console.info("🔕 Canal de atendimentos removido");
      });
      supabase.removeChannel(notificacaoChannel).then(() => {
        console.info("🔕 Canal de notificações removido");
      });
    };
  }, [queryClient, playSound]);
}
