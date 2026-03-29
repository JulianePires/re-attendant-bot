"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface KioskActionsProps {
  onEntrarFila: () => Promise<void>;
  onChamarUrgencia: () => Promise<void>;
  pacienteId?: string | null;
}

const MENSAGEM_SUCESSO = "Sua chegada foi registrada. Aguarde ser chamado.";
const MENSAGEM_ERRO_PADRAO = "Não foi possível concluir sua solicitação.";
const MENSAGEM_PACIENTE = "Paciente não identificado. Solicite ajuda na recepção.";

export function KioskActions({ onEntrarFila, onChamarUrgencia, pacienteId }: KioskActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarSucesso, setMostrarSucesso] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const podeAcionar = Boolean(pacienteId) && !isPending && !mostrarSucesso;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function iniciarFeedbackSucesso() {
    setMostrarSucesso(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setMostrarSucesso(false), 2600);
  }

  function executarAcao(acao: () => Promise<void>) {
    startTransition(() => {
      void (async () => {
        setErro(null);

        if (!pacienteId) {
          setErro(MENSAGEM_PACIENTE);
          return;
        }

        try {
          await acao();
          iniciarFeedbackSucesso();
        } catch (error) {
          setErro(error instanceof Error ? error.message : MENSAGEM_ERRO_PADRAO);
        }
      })();
    });
  }

  return (
    <div className="relative w-full">
      {mostrarSucesso && (
        <div className="bg-background/60 absolute inset-0 z-20 flex items-center justify-center rounded-3xl p-6">
          <div className="bg-card/80 shadow-primary/30 flex w-full animate-in flex-col items-center gap-4 rounded-2xl px-6 py-8 text-center shadow-2xl backdrop-blur zoom-in-95 fade-in">
            <span className="text-primary/70 text-sm tracking-[0.3em] uppercase">Confirmado</span>
            <p className="text-foreground text-2xl font-semibold">{MENSAGEM_SUCESSO}</p>
            <p className="text-muted-foreground text-sm">Aguarde na sala de espera.</p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex w-full flex-col gap-4 transition-all duration-300 ease-in-out",
          mostrarSucesso && "pointer-events-none opacity-40"
        )}
        role="group"
        aria-label="Opções de atendimento"
      >
        <button
          type="button"
          onClick={() => executarAcao(onEntrarFila)}
          aria-label="Entrar na fila de atendimento normal"
          className={cn(
            "bg-primary text-primary-foreground flex w-full items-center justify-center gap-4 rounded-2xl px-8 py-7 text-2xl font-semibold",
            "shadow-primary/30 shadow-lg transition-all duration-300 ease-in-out",
            "hover:bg-primary/90 focus-visible:ring-primary/50 focus-visible:ring-offset-background focus-visible:ring-4 focus-visible:ring-offset-2",
            "active:scale-[0.98]",
            (!podeAcionar || isPending) && "cursor-not-allowed opacity-70"
          )}
          disabled={!podeAcionar}
        >
          <LogIn className="h-8 w-8 shrink-0" aria-hidden="true" />
          {isPending ? "Registrando..." : "Entrar na Fila"}
        </button>

        <button
          type="button"
          onClick={() => executarAcao(onChamarUrgencia)}
          aria-label="Registrar chamada urgente — para casos de dor ou mal-estar"
          className={cn(
            "bg-destructive text-destructive-foreground flex w-full items-center justify-center gap-4 rounded-2xl px-8 py-7 text-2xl font-semibold",
            "shadow-destructive/30 shadow-lg transition-all duration-300 ease-in-out",
            "hover:bg-destructive/90 focus-visible:ring-destructive/50 focus-visible:ring-offset-background focus-visible:ring-4 focus-visible:ring-offset-2",
            "active:scale-[0.98]",
            (!podeAcionar || isPending) && "cursor-not-allowed opacity-70"
          )}
          disabled={!podeAcionar}
        >
          <AlertCircle className="h-8 w-8 shrink-0" aria-hidden="true" />
          {isPending ? "Registrando..." : "Falar Urgente"}
        </button>
      </div>

      {erro && (
        <p
          className="bg-destructive/15 text-destructive-foreground mt-4 rounded-xl px-4 py-2 text-center text-sm"
          role="alert"
        >
          {erro}
        </p>
      )}
    </div>
  );
}
