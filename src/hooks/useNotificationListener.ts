"use client";

/**
 * Hook para gerenciar notificações em tempo real com suporte a áudio
 * Sincroniza com Supabase Realtime e reproduz alertas sonoros
 */

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { obterResumoAtendimento } from "@/server/actions/atendimento";
import { TipoChamada, TipoChamadaValue } from "@/types";
import { ATENDIMENTOS_DIA_QUERY_KEY, FILA_ATIVA_QUERY_KEY } from "./useRealtimeQueue";

type TipoSom = "normal" | "urgente";

/**
 * Hook para gerenciar reprodução de áudio
 * Usa useRef para manter instâncias de áudio entre renders
 * Implementa fila de sons para casos onde autoplay está bloqueado
 */
function useAudioNotifications() {
  // Referências para instâncias de áudio - persistentes entre renders
  const urgentAudioRef = useRef<HTMLAudioElement | null>(null);
  const normalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Flag para rastrear se áudio foi desbloqueado pelo navegador
  const isUnlockedRef = useRef(false);

  // Fila de sons pendentes enquanto autoplay está bloqueado
  const pendingSoundsRef = useRef<TipoSom[]>([]);

  /**
   * Cria nova instância de áudio com preload
   * Memorizado para evitar recriação desnecessária
   */
  const createAudio = useCallback((src: string) => {
    try {
      const audio = new Audio(src);
      audio.preload = "auto";
      return audio;
    } catch (error) {
      console.error(`❌ Erro ao carregar áudio ${src}:`, error);
      return null;
    }
  }, []);

  /**
   * Reproduz áudio da fila ou chamada direta
   * Respeita restrições de autoplay do navegador
   */
  const playAudio = useCallback((tipo: TipoSom) => {
    const target = tipo === "urgente" ? urgentAudioRef.current : normalAudioRef.current;

    if (!target) {
      console.warn(`⚠️ Áudio ${tipo} não disponível`);
      return;
    }

    target.currentTime = 0;
    target.play().catch((error) => {
      // Erro silencioso: navegadores bloqueiam reprodução sem gesto do usuário
      console.info(`ℹ️ Reprodução bloqueada (autoplay): ${error.message}`);
    });
  }, []);

  /**
   * Interface pública para reproduzir áudio
   * Fila o som se áudio estiver bloqueado
   */
  const play = useCallback(
    (tipo: TipoSom) => {
      if (!isUnlockedRef.current) {
        pendingSoundsRef.current.push(tipo);
        return;
      }

      playAudio(tipo);
    },
    [playAudio]
  );

  /**
   * Inicializa instâncias de áudio na primeira renderização
   * Ouve eventos de usuário para desbloquear autoplay
   */
  useEffect(() => {
    urgentAudioRef.current = createAudio("/sounds/alerta.mp3");
    normalAudioRef.current = createAudio("/sounds/notificacao.mp3");

    const unlockAudio = () => {
      if (isUnlockedRef.current) {
        return;
      }

      isUnlockedRef.current = true;
      console.info("✅ Áudio desbloqueado pelo navegador");

      // Reproduz sons que estavam na fila
      pendingSoundsRef.current.forEach((tipo) => playAudio(tipo));
      pendingSoundsRef.current = [];

      // Remove event listeners após desbloqueio
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };

    // Habilita reprodução ao primeiro gesto do usuário
    window.addEventListener("pointerdown", unlockAudio, { passive: true, once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { passive: true, once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [createAudio, playAudio]);

  return play;
}

export function useNotificationListener() {
  const queryClient = useQueryClient();
  const play = useAudioNotifications();

  useEffect(() => {
    // Inscreve-se em novos atendimentos via Realtime
    const channel = supabase
      .channel("public:atendimento")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atendimento" },
        async (payload) => {
          const newAtendimento = payload.new as { id?: string; tipoChamada?: string };
          const atendimentoId = newAtendimento.id;
          let nomePaciente = "Paciente";
          let tipoChamada =
            (newAtendimento.tipoChamada as TipoChamadaValue | undefined) ?? TipoChamada.NORMAL;

          // Busca dados completos do atendimento
          if (atendimentoId) {
            const resumo = await obterResumoAtendimento(atendimentoId);
            if (resumo) {
              nomePaciente = resumo.nomePaciente;
              tipoChamada = resumo.tipoChamada;
            }
          }

          // Toast visual
          toast.info(`Novo Paciente: ${nomePaciente}`);

          // Reprodução de áudio baseada no tipo
          if (tipoChamada === TipoChamada.URGENTE) {
            play("urgente");
          } else {
            play("normal");
          }

          // Invalidação do cache para refetch de dados
          queryClient.invalidateQueries({ queryKey: ATENDIMENTOS_DIA_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
          queryClient.invalidateQueries({ queryKey: FILA_ATIVA_QUERY_KEY });
        }
      )
      .subscribe();

    // Cleanup: Remove inscrição ao desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, play]);
}
