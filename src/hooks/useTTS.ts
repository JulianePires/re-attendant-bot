"use client";

// ================================================================
// useTTS — Text-to-Speech nativo via Web Speech API
//
// Não requer nenhuma dependência externa. Funciona nativamente em
// Chrome, Edge e Safari modernos. Firefox tem suporte limitado.
//
// Decisão UX: velocidade levemente abaixo de 1 (0.92) soa mais
// natural e claro para ambientes com ruído de fundo (sala de espera).
// ================================================================

interface OpcoesVoz {
  velocidade?: number; // 0.1–10, padrão 0.92
  tom?: number; // 0–2, padrão 1
  volume?: number; // 0–1, padrão 1
}

export function useTTS() {
  const suportado = typeof window !== "undefined" && "speechSynthesis" in window;

  // getVoices() é assíncrono no Chrome: o catálogo só fica disponível
  // após o evento `voiceschanged`. Esta função tenta obter a voz PT-BR
  // diretamente e aceita o padrão do sistema se não encontrar.
  function resolverVoz(): SpeechSynthesisVoice | null {
    const vozes = window.speechSynthesis.getVoices();
    return (
      vozes.find((v) => v.lang === "pt-BR") ?? vozes.find((v) => v.lang.startsWith("pt")) ?? null
    );
  }

  function falar(texto: string, opcoes: OpcoesVoz = {}) {
    if (!suportado) return;

    // Cancela fala em andamento para evitar sobreposição de áudio
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "pt-BR";
    utterance.rate = opcoes.velocidade ?? 0.92;
    utterance.pitch = opcoes.tom ?? 1;
    utterance.volume = opcoes.volume ?? 1;

    const voz = resolverVoz();
    if (voz) utterance.voice = voz;

    window.speechSynthesis.speak(utterance);
  }

  function parar() {
    if (!suportado) return;
    window.speechSynthesis.cancel();
  }

  return { falar, parar, suportado };
}
