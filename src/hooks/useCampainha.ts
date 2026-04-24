"use client";

import { useCallback, useRef } from "react";

export function useCampainha() {
  const alertaUrgenteRef = useRef<HTMLAudioElement | null>(null);
  const notificacaoRef = useRef<HTMLAudioElement | null>(null);

  const tocarAlertaUrgente = useCallback(() => {
    if (!alertaUrgenteRef.current) {
      alertaUrgenteRef.current = new Audio("/sounds/alerta.mp3");
    }

    alertaUrgenteRef.current.currentTime = 0;
    alertaUrgenteRef.current.play().catch(() => {
      // Ignora bloqueios de autoplay do browser.
    });
  }, []);

  const pararAlertaUrgente = useCallback(() => {
    if (!alertaUrgenteRef.current) return;

    alertaUrgenteRef.current.pause();
    alertaUrgenteRef.current.currentTime = 0;
  }, []);

  const tocarNotificacao = useCallback(() => {
    if (!notificacaoRef.current) {
      notificacaoRef.current = new Audio("/sounds/notificacao.mp3");
    }

    notificacaoRef.current.currentTime = 0;
    notificacaoRef.current.play().catch(() => {
      // Ignora bloqueios de autoplay do browser.
    });
  }, []);

  return { tocarAlertaUrgente, pararAlertaUrgente, tocarNotificacao };
}
