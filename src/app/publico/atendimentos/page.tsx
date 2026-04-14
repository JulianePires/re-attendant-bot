"use client";

import { useOptimistic } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertCircle, Inbox } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FILA_PUBLICA_QUERY_KEY, useRealtimeQueuePublic } from "@/hooks/useRealtimeQueuePublic";
import { finalizarAtendimentoPublico, obterFilaPublica } from "@/server/actions/atendimento";
import { AtendimentoCard } from "@/components/painel/AtendimentoCard";
import { ConfirmarFinalizacaoDialog } from "@/components/painel/ConfirmarFinalizacaoDialog";
import type { AtendimentoNaFila } from "@/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Tela Pública de Atendimentos
 * Permite visualizar e concluir atendimentos sem necessidade de login
 * Utilizada por funcionários da recepção em dispositivos compartilhados
 */
export default function PublicoAtendimentosPage() {
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  // Query da fila ativa
  const { data: filaAtiva = [], isError } = useQuery({
    queryKey: FILA_PUBLICA_QUERY_KEY,
    queryFn: obterFilaPublica,
    staleTime: 0,
    refetchInterval: 5000, // Refetch a cada 5s como fallback
  });

  // Realtime updates
  useRealtimeQueuePublic();

  // Optimistic updates
  const [optimisticFila, setOptimisticFila] = useOptimistic<AtendimentoNaFila[], string>(
    filaAtiva,
    (state, atendimentoId) => state.filter((item) => item.id !== atendimentoId)
  );

  // Mutation para finalizar atendimento
  const finalizarMutation = useMutation({
    mutationFn: (atendimentoId: string) => finalizarAtendimentoPublico(atendimentoId),
    onMutate: async (atendimentoId) => {
      await queryClient.cancelQueries({ queryKey: FILA_PUBLICA_QUERY_KEY });
      setOptimisticFila(atendimentoId);

      const paciente = filaAtiva.find((a) => a.id === atendimentoId);
      toast.success(`Atendimento concluído: ${paciente?.nomePaciente || "Paciente"}`, {
        duration: 3000,
        description: "O paciente foi removido da fila ativa",
      });

      // Fechar o diálogo
      setDialogAberto(false);
      setAtendimentoSelecionado(null);
    },
    onError: () => {
      toast.error("Erro ao concluir atendimento", {
        description: "Tente novamente ou contacte o suporte",
      });
      queryClient.invalidateQueries({ queryKey: FILA_PUBLICA_QUERY_KEY });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILA_PUBLICA_QUERY_KEY });
    },
  });

  const handleAtender = (atendimentoId: string, nomePaciente: string) => {
    setAtendimentoSelecionado({ id: atendimentoId, nome: nomePaciente });
    setDialogAberto(true);
  };

  const handleConfirmarFinalizacao = () => {
    if (atendimentoSelecionado) {
      finalizarMutation.mutate(atendimentoSelecionado.id);
    }
  };

  // Separar por tipo
  const pacientesNormais = optimisticFila.filter((a) => a.tipoChamada === "normal");
  const pacientesUrgentes = optimisticFila.filter((a) => a.tipoChamada === "urgente");

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
              {optimisticFila.length} paciente{optimisticFila.length !== 1 ? "s" : ""} aguardando
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
                  <AtendimentoCard
                    key={atendimento.id}
                    atendimento={atendimento}
                    posicao={index + 1}
                    onAtender={handleAtender}
                    isLoading={finalizarMutation.isPending}
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
                  <AtendimentoCard
                    key={atendimento.id}
                    atendimento={atendimento}
                    posicao={index + 1}
                    onAtender={handleAtender}
                    isLoading={finalizarMutation.isPending}
                    variant="urgente"
                  />
                ))
              )}
            </AnimatePresence>
          </ColumnSection>
        </div>

        {/* Modal de Confirmação */}
        <ConfirmarFinalizacaoDialog
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          nomePaciente={atendimentoSelecionado?.nome || ""}
          onConfirm={handleConfirmarFinalizacao}
          isLoading={finalizarMutation.isPending}
        />
      </div>
    </div>
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
