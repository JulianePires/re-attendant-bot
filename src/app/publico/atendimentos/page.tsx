"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertCircle, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FILA_PUBLICA_QUERY_KEY, useRealtimeQueuePublic } from "@/hooks/useRealtimeQueuePublic";
import { obterFilaPublica } from "@/server/actions/atendimento";
import type { AtendimentoNaFila } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Tela Pública de Atendimentos — READ-ONLY
 * Exibe a fila em tempo real sem permitir ações de conclusão.
 */
export default function PublicoAtendimentosPage() {
  // Query da fila ativa
  const { data: filaAtiva = [], isError } = useQuery({
    queryKey: FILA_PUBLICA_QUERY_KEY,
    queryFn: obterFilaPublica,
    staleTime: 0,
    refetchInterval: 30000,
  });

  // Realtime updates
  useRealtimeQueuePublic();

  // Separar por tipo
  const pacientesNormais = filaAtiva.filter((a) => a.tipoChamada === "normal");
  const pacientesUrgentes = filaAtiva.filter((a) => a.tipoChamada === "urgente");

  // Estado de erro
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
        {/* Header Stats */}
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
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Coluna 1: Pacientes Normais */}
          <ColumnSection
            title="Atendimento Normal"
            icon={Users}
            count={pacientesNormais.length}
            variant="normal"
          >
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

          {/* Coluna 2: Pacientes Urgentes */}
          <ColumnSection
            title="Chamadas Urgentes"
            icon={AlertCircle}
            count={pacientesUrgentes.length}
            variant="urgente"
          >
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

// ── Card read-only (sem botão de concluir) ──

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
    </motion.div>
  );
}

// ── Components auxiliares ──

function ColumnSection({
  title,
  icon: Icon,
  count,
  variant,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
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
        <span
          className={cn(
            "flex h-7 min-w-7 items-center justify-center rounded-full px-2.5 text-xs font-bold",
            isUrgente
              ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
              : "bg-violet-500/20 text-violet-400"
          )}
        >
          {count}
        </span>
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
