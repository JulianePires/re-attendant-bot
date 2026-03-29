"use client";

import { useEffect, useRef } from "react";
import { useTTS } from "@/hooks/useTTS";

const MENSAGEM_BOAS_VINDAS =
  "Ola! Seja bem-vindo a clinica. Toque em 'Entrar na Fila' para confirmar sua chegada, ou no botao vermelho se precisar de atendimento urgente.";

export function VoiceGreeter() {
  const { falar, suportado } = useTTS();
  const falouRef = useRef(false);

  useEffect(() => {
    if (falouRef.current || !suportado) return;
    falouRef.current = true;
    falar(MENSAGEM_BOAS_VINDAS);
  }, [falar, suportado]);

  return null;
}
