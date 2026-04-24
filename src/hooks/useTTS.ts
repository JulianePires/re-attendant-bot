"use client";

import { useCallback } from "react";

// ================================================================
// useTTS — Text-to-Speech nativo via Web Speech API
//
// Não requer nenhuma dependência externa. Funciona nativamente em
// Chrome, Edge e Safari modernos. Firefox tem suporte limitado.
//
// Decisão UX: velocidade levemente abaixo de 1 (0.92) soa mais
// natural e claro para ambientes com ruído de fundo (sala de espera).
// ================================================================

export function useTTS() {
  const suportado = typeof window !== "undefined" && "speechSynthesis" in window;

  // getVoices() é assíncrono no Chrome: o catálogo só fica disponível
  // após o evento `voiceschanged`. Esta função tenta obter a voz PT-BR
  // diretamente e aceita o padrão do sistema se não encontrar.
  const resolverVoz = useCallback((): SpeechSynthesisVoice | null => {
    const vozes = window.speechSynthesis.getVoices();
    return (
      vozes.find((v) => v.lang === "pt-BR" && v.name.includes("Maria")) ??
      vozes.find((v) => v.lang.startsWith("pt")) ??
      null
    );
  }, []);

  const falar = useCallback(
    (texto: string, onStart: () => void = () => {}, onEnd: () => void = () => {}) => {
      if (!suportado) return;

      // Cancela fala em andamento para evitar sobreposição de áudio
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = "pt-BR";
      utterance.rate = 0.92;
      utterance.pitch = 1.2;
      utterance.volume = 1;
      utterance.onend = () => onEnd();
      utterance.onstart = () => onStart();

      const voz = resolverVoz();
      if (voz) utterance.voice = voz;

      window.speechSynthesis.speak(utterance);
    },
    [suportado, resolverVoz]
  );

  const parar = useCallback(() => {
    if (!suportado) return;
    window.speechSynthesis.cancel();
  }, [suportado]);

  return { falar, parar, suportado };
}
