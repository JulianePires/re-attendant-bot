"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Hook para gerenciar reprodução de áudio de notificações
 *
 * Implementa:
 * - Preload de áudio com useMemo/useRef
 * - Desbloqueio automático de autoplay no primeiro clique
 * - Fila de sons pendentes enquanto áudio está bloqueado
 *
 * @returns Função `play(type)` para reproduzir áudio
 */

type SoundType = "normal" | "urgente";

export function useNotificationSound() {
  // Referências para instâncias de áudio - persistentes entre renders
  const normalAudioRef = useRef<HTMLAudioElement | null>(null);
  const urgenteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Flag para rastrear se áudio foi desbloqueado
  const isUnlockedRef = useRef(false);

  // Fila de sons pendentes enquanto autoplay está bloqueado
  const pendingSoundsRef = useRef<SoundType[]>([]);

  /**
   * Função interna para reproduzir áudio
   */
  const playSound = useCallback((type: SoundType) => {
    const audio = type === "urgente" ? urgenteAudioRef.current : normalAudioRef.current;

    if (!audio) {
      console.warn(`⚠️ Áudio ${type} não disponível`);
      return;
    }

    // Reset e reproduz
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.info(`ℹ️ Reprodução bloqueada (autoplay): ${error.message}`);
    });
  }, []);

  /**
   * Inicializa instâncias de áudio na montagem
   */
  useEffect(() => {
    // Preload de áudio
    normalAudioRef.current = new Audio("/sounds/notificacao.mp3");
    urgenteAudioRef.current = new Audio("/sounds/alerta.mp3");

    // Configurar preload
    if (normalAudioRef.current) {
      normalAudioRef.current.preload = "auto";
      normalAudioRef.current.volume = 0.7;
    }

    if (urgenteAudioRef.current) {
      urgenteAudioRef.current.preload = "auto";
      urgenteAudioRef.current.volume = 0.9;
    }

    /**
     * Desbloqueia áudio no primeiro gesto do usuário
     */
    const unlockAudio = async () => {
      if (isUnlockedRef.current) return;

      try {
        // Tenta reproduzir silenciosamente para desbloquear
        const promises = [];

        if (normalAudioRef.current) {
          normalAudioRef.current.volume = 0;
          promises.push(
            normalAudioRef.current.play().then(() => {
              normalAudioRef.current!.pause();
              normalAudioRef.current!.currentTime = 0;
              normalAudioRef.current!.volume = 0.7;
            })
          );
        }

        if (urgenteAudioRef.current) {
          urgenteAudioRef.current.volume = 0;
          promises.push(
            urgenteAudioRef.current.play().then(() => {
              urgenteAudioRef.current!.pause();
              urgenteAudioRef.current!.currentTime = 0;
              urgenteAudioRef.current!.volume = 0.9;
            })
          );
        }

        await Promise.all(promises);

        isUnlockedRef.current = true;
        console.info("✅ Áudio desbloqueado pelo navegador");

        // Reproduz sons que estavam na fila
        while (pendingSoundsRef.current.length > 0) {
          const soundType = pendingSoundsRef.current.shift();
          if (soundType) {
            playSound(soundType);
          }
        }

        // Remove listeners após desbloqueio
        document.removeEventListener("click", unlockAudio);
        document.removeEventListener("keydown", unlockAudio);
        document.removeEventListener("touchstart", unlockAudio);
      } catch (error) {
        console.warn("⚠️ Falha ao desbloquear áudio:", error);
      }
    };

    // Adiciona listeners para desbloquear no primeiro gesto
    document.addEventListener("click", unlockAudio, { once: true, passive: true });
    document.addEventListener("keydown", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true, passive: true });

    // Cleanup
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, [playSound]);

  /**
   * Interface pública para reproduzir áudio
   * Fila o som se áudio ainda estiver bloqueado
   */
  const play = useCallback(
    (type: SoundType) => {
      if (!isUnlockedRef.current) {
        // Áudio ainda bloqueado - adiciona à fila
        pendingSoundsRef.current.push(type);
        console.info(`🔇 Áudio ${type} adicionado à fila (aguardando desbloqueio)`);
        return;
      }

      playSound(type);
    },
    [playSound]
  );

  return play;
}
