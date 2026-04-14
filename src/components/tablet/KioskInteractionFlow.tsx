"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTTS } from "@/hooks/useTTS";
import { registrarEEntrarNaFila } from "@/server/actions/atendimento";
import { Loader2, ArrowLeft, HeartPulse, Play } from "lucide-react";
import { TipoChamadaValue } from "@/types";
import { toast } from "sonner";

type Step = "IDLE" | "HOME" | "FORM" | "SUCCESS";

interface KioskInteractionFlowProps {
  handleToggleTalking?: (talking: boolean) => void;
}

export function KioskInteractionFlow({ handleToggleTalking }: KioskInteractionFlowProps) {
  const [step, setStep] = useState<Step>("IDLE");
  const [nome, setNome] = useState("");
  const [tipoChamada, setTipoChamada] = useState<TipoChamadaValue>("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { falar, parar } = useTTS();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Zera todo o estado e volta pro inicio
  const resetFlow = () => {
    setStep("IDLE");
    setNome("");
    setTipoChamada("normal");
    setIsSubmitting(false);
    parar();
    if (handleToggleTalking) handleToggleTalking(false);
  };

  // Reseta se ficar inativo por 30s
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (step !== "IDLE" && step !== "SUCCESS") {
      timerRef.current = setTimeout(() => {
        resetFlow();
      }, 30000);
    }
  };

  function handleStart() {
    setStep("HOME");
  }

  function handleChooseOption(tipo: TipoChamadaValue) {
    setTipoChamada(tipo);
    setStep("FORM");
  }

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, nome]);

  // TTS Feedback — dispara ao entrar em HOME (após Iniciar) e demais telas
  useEffect(() => {
    if (step === "IDLE") return;

    const onStart = () => handleToggleTalking?.(true);
    const onEnd = () => handleToggleTalking?.(false);

    switch (step) {
      case "HOME":
        falar(
          "Olá! Bem-vindo. Escolha entre entrar na fila de atendimento ou solicitar a presença de um profissional.",
          onStart,
          onEnd
        );
        break;
      case "FORM":
        falar("Digite seu nome e confirme.", onStart, onEnd);
        break;
      case "SUCCESS":
        falar("Tudo certo! Aguarde que logo você será chamado.", onStart, onEnd);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleAction = async () => {
    if (isSubmitting) return;
    if (nome.trim().length < 2) {
      toast.error("Digite seu nome para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registrarEEntrarNaFila({
        nome: nome.trim(),
        tipoChamada,
      });
      toast.success("Entrada na fila registrada com sucesso.");
      setStep("SUCCESS");
      setTimeout(() => resetFlow(), 5000);
    } catch {
      toast.error("Ocorreu um erro. Verifique os dados ou contate a recepção.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const BTN_BASE =
    "flex w-64 h-20 flex-col items-center justify-center gap-1 rounded-2xl px-6 py-5 text-lg font-semibold backdrop-blur-sm transition-all active:scale-95";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex h-full w-full flex-col text-zinc-100 select-none"
      onClick={resetTimer}
    >
      <AnimatePresence mode="wait">
        {step === "IDLE" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="pointer-events-auto mt-auto flex w-full justify-start px-6 pb-12"
          >
            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-3 rounded-full border border-violet-500/50 bg-violet-600/20 px-10 py-4 text-lg font-bold text-violet-100 shadow-[0_0_30px_rgba(124,58,237,0.15)] backdrop-blur-sm transition-all hover:bg-violet-600/30 hover:shadow-[0_0_40px_rgba(124,58,237,0.25)] active:scale-95"
            >
              <Play className="h-5 w-5 fill-current" />
              Toque para iniciar
            </button>
          </motion.div>
        )}

        {step === "HOME" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-auto mt-auto flex w-full justify-between gap-4 px-6 pb-10"
          >
            <button
              type="button"
              onClick={() => handleChooseOption("normal")}
              className={`${BTN_BASE} border border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`}
            >
              Entrar na fila
              <span className="text-[16px] font-medium text-zinc-400">Aguardar atendimento</span>
            </button>

            <button
              type="button"
              onClick={() => handleChooseOption("urgente")}
              className={`${BTN_BASE} border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20`}
            >
              <span className="flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4" /> Urgente
              </span>
              <span className="text-[16px] font-medium text-zinc-400">Falar com profissional</span>
            </button>
          </motion.div>
        )}

        {step === "FORM" && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center"
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={resetFlow}
              className="absolute top-8 left-8 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-lg font-medium text-zinc-400 shadow-lg transition-all duration-300 hover:bg-zinc-800/80 hover:text-zinc-100 hover:shadow-xl active:scale-95"
            >
              <ArrowLeft className="h-6 w-6" /> Voltar ao Início
            </motion.button>

            <div className="relative mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-zinc-800/60 bg-zinc-950/80 p-6 backdrop-blur-sm">
              <div className="mb-4 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Identificação rápida
                </h2>
                <p className="mt-2 text-base text-zinc-400">Informe seu nome</p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-5 text-center text-3xl text-zinc-100 transition-all placeholder:text-zinc-700 focus:border-violet-500 focus:shadow-[0_0_20px_rgba(124,58,237,0.2)] focus:outline-none"
                  placeholder="Digite seu nome"
                  autoComplete="off"
                />
              </div>

              <button
                onClick={handleAction}
                disabled={isSubmitting}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-violet-600 py-4 text-lg font-bold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:scale-[1.02] hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2 text-base font-medium">
                    <Loader2 className="h-5 w-5 animate-spin" /> Adicionando à fila...
                  </span>
                ) : (
                  "CONFIRMAR E ENTRAR NA FILA"
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === "SUCCESS" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center"
          >
            <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-6 pb-8 text-center backdrop-blur-sm">
              <div className="mt-2 mb-4 flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400 bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                >
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-emerald-400">
                Tudo certo!
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-emerald-100/70">
                Sua chegada está confirmada.
                <br />
                Por favor, aguarde na recepção que logo chamaremos seu nome.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
