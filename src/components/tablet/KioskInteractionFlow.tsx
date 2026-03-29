"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTTS } from "@/hooks/useTTS";
import { buscarPacientePorCPF, registrarEEntrarNaFila } from "@/server/actions/atendimento";
import { Loader2, ArrowLeft, HeartPulse, UserCircle } from "lucide-react";
import { DoctorLoader } from "@/components/common/DoctorLoader";
import { TipoChamadaValue } from "@/types";
import { toast } from "sonner";

const formatCPF = (val: string) => {
  return val
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

type Step =
  | "HOME"
  | "CPF_INPUT"
  | "CHECKING"
  | "WELCOME_BACK"
  | "REGISTER"
  | "URGENT_FORM"
  | "SUCCESS";

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
    className={`relative mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-zinc-800/60 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-xl ${className}`}
  >
    {children}
  </motion.div>
);

export function KioskInteractionFlow() {
  const [step, setStep] = useState<Step>("HOME");
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { falar, parar } = useTTS();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Zera todo o estado e volta pro inicio
  const resetFlow = () => {
    setStep("HOME");
    setCpf("");
    setNome("");
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
  }, [step, cpf, nome]);

  // TTS Feedback ao entrar em novas telas
  useEffect(() => {
    switch (step) {
      case "HOME":
        falar("Bem-vindo. Toque na tela para iniciar seu atendimento.");
        break;
      case "CPF_INPUT":
        falar("Por favor, digite seu C P F.");
        break;
      case "WELCOME_BACK":
        falar(`Olá, ${nome}! Que bom ver você de novo. Por favor, confirme sua chegada.`);
        break;
      case "REGISTER":
        falar("Boas-vindas! Parece que é sua primeira vez. Poderia nos dizer seu nome?");
        break;
      case "URGENT_FORM":
        falar("Atendimento Urgente. Por favor, informe seu nome.");
        break;
      case "SUCCESS":
        falar("Tudo certo! Aguarde que logo você será chamado.");
        break;
    }
  }, [step, falar, nome]);

  // Trigger automático ao finalizar os 11 dígitos do CPF (com formatação fica 14)
  useEffect(() => {
    const checkCpf = async (currentCpf: string) => {
      if (currentCpf.length === 14 && step === "CPF_INPUT") {
        setStep("CHECKING");
        try {
          const [paciente] = await Promise.all([
            buscarPacientePorCPF(currentCpf),
            new Promise((resolve) => setTimeout(resolve, 800)), // Garante tempo para a animação do CHECKING
          ]);

          if (paciente) {
            setNome(paciente.name);
            setStep("WELCOME_BACK");
          } else {
            setStep("REGISTER");
          }
        } catch {
          setStep("REGISTER");
        }
      }
    };
    checkCpf(cpf);
  }, [cpf, step]);

  const handleAction = async (tipo: "normal" | "urgente") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await registrarEEntrarNaFila({
        nome: nome || "Paciente Não Identificado",
        cpf: cpf || "00000000000", // CPF provisório se for urgência severa sem docs
        tipoChamada: tipo as TipoChamadaValue,
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
        {step !== "HOME" && step !== "SUCCESS" && step !== "CHECKING" && (
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
          <PageTransition
            key="home"
            className="!max-w-3xl border-none bg-transparent py-0 shadow-none"
          >
            <h1 className="mb-8 text-center text-3xl font-bold text-zinc-100 drop-shadow-md">
              Como podemos ajudá-lo hoje?
            </h1>
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 px-2 sm:grid-cols-2">
              <button
                onClick={() => setStep("CPF_INPUT")}
                className="group flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-violet-500/50 hover:bg-zinc-800/80 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] active:scale-[0.98]"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
                  <UserCircle className="h-7 w-7 text-violet-400 transition-transform group-hover:scale-110 group-hover:text-violet-300" />
                </div>
                <span className="text-xl font-semibold text-zinc-100">Entrar na Fila</span>
                <span className="mt-2 text-center text-xs font-medium text-zinc-400">
                  Check-in para consultas e exames
                </span>
              </button>

              <button
                onClick={() => setStep("URGENT_FORM")}
                className="group flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-red-500/50 hover:bg-zinc-800/80 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] active:scale-[0.98]"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 transition-colors group-hover:bg-red-500/20">
                  <HeartPulse className="h-7 w-7 text-red-400 transition-transform group-hover:scale-110 group-hover:text-red-300" />
                </div>
                <span className="text-xl font-semibold text-zinc-100">Ajuda Urgente</span>
                <span className="mt-2 text-center text-xs font-medium text-zinc-400">
                  Fisiologia alterada ou risco imediato
                </span>
              </button>
            </div>
          </PageTransition>
        )}

        {step === "CPF_INPUT" && (
          <PageTransition key="cpf" className="max-w-xl">
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white">Identifique-se</h2>
              <p className="mt-2 text-base text-zinc-400">Por favor, digite seu CPF abaixo</p>
            </div>
            <div className="mt-2">
              <input
                type="tel"
                autoFocus
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-center font-mono text-3xl tracking-[0.25em] text-zinc-100 transition-all placeholder:text-zinc-700 focus:border-violet-500 focus:shadow-[0_0_20px_rgba(124,58,237,0.2)] focus:outline-none"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div className="mt-1 flex h-6 items-center justify-center">
              {cpf.length > 0 && cpf.length < 14 && (
                <p className="text-sm font-medium text-violet-400">Continue digitando...</p>
              )}
            </div>
          </PageTransition>
        )}

        {step === "CHECKING" && (
          <PageTransition key="checking" className="border-none bg-transparent shadow-none">
            <DoctorLoader message="Buscando seu cadastro..." />
          </PageTransition>
        )}

        {step === "WELCOME_BACK" && (
          <PageTransition key="welcome" className="max-w-xl">
            <div className="mb-2 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400">
                <UserCircle className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Olá, {nome.split(" ")[0]}!
              </h2>
              <p className="mt-1 text-sm text-zinc-400">Que bom ver você de novo por aqui.</p>
            </div>

            <button
              onClick={() => handleAction("normal")}
              disabled={isSubmitting}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-violet-600 py-4 text-lg font-bold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:scale-[1.02] hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2 text-base font-medium">
                  <Loader2 className="h-5 w-5 animate-spin" /> Adicionando à fila...
                </span>
              ) : (
                "CONFIRMAR CHEGADA"
              )}
            </button>
          </PageTransition>
        )}

        {step === "REGISTER" && (
          <PageTransition key="register" className="max-w-xl">
            <h2 className="text-center text-2xl font-bold tracking-tight">
              Boas-vindas à Clínica!
            </h2>
            <p className="mt-1 mb-4 text-center text-sm text-zinc-400">
              Poderia nos dizer o seu nome?
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block pl-2 text-sm font-medium text-zinc-400">
                  Nome Completo
                </label>
                <input
                  type="text"
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-lg text-white transition-all outline-none placeholder:text-zinc-600 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                  placeholder="Toque para digitar"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block pl-2 text-sm font-medium text-zinc-500">
                  CPF Vinculado
                </label>
                <input
                  type="text"
                  value={cpf}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-3 font-mono text-lg text-zinc-500 opacity-80"
                />
              </div>
            </div>

            <button
              onClick={() => handleAction("normal")}
              disabled={isSubmitting || nome.trim().length < 3}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:bg-zinc-800 disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "PROSSEGUIR"}
            </button>
          </PageTransition>
        )}

        {step === "URGENT_FORM" && (
          <PageTransition
            key="urgent"
            className="relative max-w-xl overflow-hidden !border-red-500/20"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-600/0 via-red-500 to-red-600/0 opacity-50"></div>
            <h2 className="text-center text-2xl font-bold tracking-tight text-red-500">
              Atendimento Urgente
            </h2>
            <p className="mt-1 mb-4 text-center text-sm text-red-200/60">
              Insira apenas os dados básicos para darmos prioridade.
            </p>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-red-500/20 bg-zinc-900 px-4 py-3 text-lg text-white transition-all placeholder:text-zinc-600 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.2)] focus:outline-none"
                  placeholder="Nome do Paciente"
                />
              </div>
              <div>
                <input
                  type="tel"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className="w-full rounded-xl border border-red-500/10 bg-zinc-900/60 px-4 py-3 font-mono text-lg tracking-wider text-white transition-all placeholder:text-zinc-700 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)] focus:outline-none"
                  placeholder="CPF (Opcional)"
                  maxLength={14}
                />
              </div>
            </div>

            <button
              onClick={() => handleAction("urgente")}
              disabled={isSubmitting || nome.trim().length < 2}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 bg-gradient-to-r from-red-600 to-red-700 py-4 text-lg font-bold text-white shadow-[0_5px_20px_rgba(239,68,68,0.3)] transition-all hover:scale-[1.02] hover:bg-red-500 hover:shadow-[0_10px_30px_rgba(239,68,68,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Acionando equipe...
                </span>
              ) : (
                <>SOLICITAR AJUDA AGORA</>
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
