"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertCircle, Inbox, Clock, Maximize, Minimize } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FILA_PUBLICA_QUERY_KEY, useRealtimeQueuePublic } from "@/hooks/useRealtimeQueuePublic";
import { useCampainha } from "@/hooks/useCampainha";
import { obterFilaPublica } from "@/server/actions/atendimento";
import type { AtendimentoNaFila } from "@/types";
import { cn } from "@/lib/utils";
import { calcularTempoEspera } from "@/lib/utils/funcoes";
import { useState, useEffect, useRef } from "react";

export default function RecepcaoPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { tocarAlertaUrgente, tocarNotificacao } = useCampainha();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const { data: filaAtiva = [], isError } = useQuery({
    queryKey: FILA_PUBLICA_QUERY_KEY,
    queryFn: obterFilaPublica,
    staleTime: 0,
    refetchInterval: 10000,
  });

  useRealtimeQueuePublic();

  const prevFilaRef = useRef<AtendimentoNaFila[] | null>(null);
  useEffect(() => {
    if (prevFilaRef.current === null) {
      prevFilaRef.current = filaAtiva;
      return undefined;
    }

    const prevIds = new Set(prevFilaRef.current.map((a) => a.id));
    const novos = filaAtiva.filter((a) => !prevIds.has(a.id));

    for (const novo of novos) {
      if (novo.tipoChamada === "urgente") {
        tocarAlertaUrgente();
        break;
      } else {
        tocarNotificacao();
        break;
      }
    }

    prevFilaRef.current = filaAtiva;
    return undefined;
  }, [filaAtiva, tocarAlertaUrgente, tocarNotificacao]);

  const pacientesNormais = filaAtiva.filter((a) => a.tipoChamada === "normal");
  const pacientesUrgentes = filaAtiva.filter((a) => a.tipoChamada === "urgente");

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-red-400">
          <AlertCircle className="h-10 w-10" />
          <p className="text-sm">Erro ao carregar a fila. Recarregue a página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Atendimentos</h1>
            <p className="mt-1 text-sm text-slate-400">
              {filaAtiva.length} paciente{filaAtiva.length !== 1 ? "s" : ""} aguardando
            </p>
          </div>

          <div className="flex items-center gap-4">
            <StatBadge
              label="Normal"
              value={pacientesNormais.length}
              className="border-violet-500/30 bg-violet-500/10 text-violet-400"
            />
            <StatBadge
              label="Urgente"
              value={pacientesUrgentes.length}
              className="border-red-500/30 bg-red-500/10 text-red-400"
            />
            <button
              onClick={toggleFullscreen}
              className="group relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 transition-all hover:border-violet-500/50 hover:bg-slate-800 hover:text-violet-400 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ColumnSection title="Atendimento Normal" icon={Users} variant="normal">
            <AnimatePresence mode="popLayout">
              {pacientesNormais.length === 0 ? (
                <EmptyState message="Nenhum paciente aguardando" />
              ) : (
                pacientesNormais.map((atendimento, index) => (
                  <AtendimentoReadOnlyCard
                    key={atendimento.id}
                    atendimento={atendimento}
                    posicao={index + 1}
                    variant="normal"
                  />
                ))
              )}
            </AnimatePresence>
          </ColumnSection>

          <ColumnSection title="Chamadas Urgentes" icon={AlertCircle} variant="urgente">
            <AnimatePresence mode="popLayout">
              {pacientesUrgentes.length === 0 ? (
                <EmptyState message="Nenhuma urgência no momento" variant="urgente" />
              ) : (
                pacientesUrgentes.map((atendimento, index) => (
                  <AtendimentoReadOnlyCard
                    key={atendimento.id}
                    atendimento={atendimento}
                    posicao={index + 1}
                    variant="urgente"
                  />
                ))
              )}
            </AnimatePresence>
          </ColumnSection>
        </div>
      </div>
    </div>
  );
}

function AtendimentoReadOnlyCard({
  atendimento,
  posicao,
  variant,
}: {
  atendimento: AtendimentoNaFila;
  posicao: number;
  variant: "normal" | "urgente";
}) {
  const isUrgente = variant === "urgente";
  const tempoEspera = calcularTempoEspera(atendimento.criadoEm);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-4 rounded-2xl border px-5 py-4",
        isUrgente ? "border-red-500/20 bg-red-950/20" : "border-slate-700/50 bg-slate-900/60"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          isUrgente ? "bg-red-500/20 text-red-400" : "bg-violet-500/20 text-violet-400"
        )}
      >
        {posicao}
      </div>
      <span className="flex-1 text-base font-semibold text-slate-100">
        {atendimento.nomePaciente}
      </span>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        <span>Aguardando {tempoEspera}</span>
      </div>
    </motion.div>
  );
}

function ColumnSection({
  title,
  icon: Icon,
  variant,
  children,
}: {
  title: string;
  icon: React.ElementType;
  variant: "normal" | "urgente";
  children: React.ReactNode;
}) {
  const isUrgente = variant === "urgente";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isUrgente ? "bg-red-500/20 text-red-400" : "bg-violet-500/20 text-violet-400"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        </div>
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function StatBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-4 py-2", className)}>
      <span className="text-xs font-medium opacity-80">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

function EmptyState({
  message,
  variant = "normal",
}: {
  message: string;
  variant?: "normal" | "urgente";
}) {
  const isUrgente = variant === "urgente";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border p-12 text-center",
        isUrgente ? "border-red-900/30 bg-red-950/10" : "border-slate-800 bg-slate-900/50"
      )}
    >
      <Inbox className={cn("mb-4 h-12 w-12", isUrgente ? "text-red-500/40" : "text-slate-600")} />
      <p className="text-sm text-slate-400">{message}</p>
    </motion.div>
  );
}
