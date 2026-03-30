"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTTS } from "@/hooks/useTTS";
import { registrarEEntrarNaFila } from "@/server/actions/atendimento";
import { Loader2, ArrowLeft, HeartPulse, UserCircle } from "lucide-react";
import { TipoChamadaValue } from "@/types";
import { toast } from "sonner";

type Step = "HOME" | "FORM" | "SUCCESS";

const PageTransition = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.05 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className={`relative mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-zinc-800/60 bg-zinc-950/70 p-6 ${className}`}
  >
    {children}
  </motion.div>
);

export function KioskInteractionFlow() {
  const [step, setStep] = useState<Step>("HOME");
  const [nome, setNome] = useState("");
  const [tipoChamada, setTipoChamada] = useState<TipoChamadaValue>("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { falar, parar } = useTTS();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Zera todo o estado e volta pro inicio
  const resetFlow = () => {
    setStep("HOME");
    setNome("");
    setTipoChamada("normal");
    setIsSubmitting(false);
    parar();
  };

  // Reseta se ficar inativo por 30s
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (step !== "HOME" && step !== "SUCCESS") {
      timerRef.current = setTimeout(() => {
        resetFlow();
      }, 30000);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, nome]);

  // TTS Feedback ao entrar em novas telas
  useEffect(() => {
    switch (step) {
      case "HOME":
        falar("Bem-vindo. Toque na tela para iniciar seu atendimento.");
        break;
      case "FORM":
        falar("Digite seu nome, escolha normal ou urgência e confirme sua entrada na fila.");
        break;
      case "SUCCESS":
        falar("Tudo certo! Aguarde que logo você será chamado.");
        break;
    }
  }, [step, falar, nome]);

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

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-2 text-zinc-100 select-none"
      onClick={resetTimer}
    >
      <AnimatePresence mode="wait">
        {step === "FORM" && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetFlow}
            className="fixed top-8 left-8 z-50 flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-5 py-3 text-lg font-medium text-zinc-400 shadow-lg transition-all duration-300 hover:bg-zinc-800/80 hover:text-zinc-100 hover:shadow-xl active:scale-95"
          >
            <ArrowLeft className="h-6 w-6" /> Voltar ao Início
          </motion.button>
        )}

        {step === "HOME" && (
          <PageTransition key="home" className="max-w-3xl! border-none bg-transparent py-0">
            <h1 className="mb-6 text-center text-3xl font-bold text-zinc-100">
              Check-in da recepção
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-center text-zinc-300">
              Toque para iniciar e entrar na fila em segundos.
            </p>
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 px-2">
              <button
                onClick={() => setStep("FORM")}
                className="group flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-violet-500/50 hover:bg-zinc-800/80 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] active:scale-[0.98]"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
                  <UserCircle className="h-7 w-7 text-violet-400 transition-transform group-hover:scale-110 group-hover:text-violet-300" />
                </div>
                <span className="text-xl font-semibold text-zinc-100">Iniciar Atendimento</span>
                <span className="mt-2 text-center text-xs font-medium text-zinc-400">
                  Digite seu nome e escolha o tipo de chamada
                </span>
              </button>
            </div>
          </PageTransition>
        )}

        {step === "FORM" && (
          <PageTransition key="form" className="max-w-xl">
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white">Identificação rápida</h2>
              <p className="mt-2 text-base text-zinc-400">
                Informe seu nome e prioridade do atendimento
              </p>
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

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoChamada("normal")}
                  className={`rounded-xl border px-4 py-4 text-lg font-semibold transition-all ${
                    tipoChamada === "normal"
                      ? "border-violet-500 bg-violet-500/15 text-violet-200"
                      : "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <span className="block">Normal</span>
                  <span className="mt-1 block text-xs font-medium text-zinc-400">
                    Consulta e exame
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoChamada("urgente")}
                  className={`rounded-xl border px-4 py-4 text-lg font-semibold transition-all ${
                    tipoChamada === "urgente"
                      ? "border-red-500 bg-red-500/15 text-red-200"
                      : "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <HeartPulse className="h-5 w-5" /> Urgência
                  </span>
                  <span className="mt-1 block text-xs font-medium text-zinc-400">
                    Prioridade imediata
                  </span>
                </button>
              </div>
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
          </PageTransition>
        )}

        {step === "SUCCESS" && (
          <PageTransition
            key="success"
            className="max-w-sm border-emerald-500/30 bg-emerald-950/20 pb-8 text-center"
          >
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
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-emerald-400">Tudo certo!</h2>
            <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-emerald-100/70">
              Sua chegada está confirmada.
              <br />
              Por favor, aguarde na recepção que logo chamaremos seu nome.
            </p>
          </PageTransition>
        )}
      </AnimatePresence>
    </div>
  );
}
