"use client";

import { motion } from "framer-motion";
import { Clock, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtendimentoNaFila } from "@/types";
import { calcularTempoEspera } from "@/lib/utils/funcoes";

interface AtendimentoCardProps {
  atendimento: AtendimentoNaFila;
  posicao: number;
  onAtender: (id: string, nome: string) => void;
  isLoading?: boolean;
  variant?: "normal" | "urgente";
}

export function AtendimentoCard({
  atendimento,
  posicao,
  onAtender,
  isLoading = false,
  variant = "normal",
}: AtendimentoCardProps) {
  const isUrgente = variant === "urgente";

  const tempoEspera = calcularTempoEspera(atendimento.criadoEm);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-300",
        isUrgente
          ? "border-red-900/50 bg-slate-900 shadow-[0_0_20px_rgba(220,38,38,0.15)] hover:shadow-[0_0_30px_rgba(220,38,38,0.25)]"
          : "border-slate-800 bg-slate-900 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10"
      )}
    >
      {/* Glow Background (Urgente) */}
      {isUrgente && (
        <div className="absolute inset-0 bg-linear-to-br from-red-900/10 to-transparent" />
      )}

      <div className="relative p-5">
        <div className="flex items-start justify-between">
          {/* Info */}
          <div className="flex-1 space-y-3">
            {/* Nome + Badge */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                  isUrgente
                    ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/30"
                    : "bg-violet-500/20 text-violet-400"
                )}
              >
                {posicao}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-slate-100">
                  {atendimento.nomePaciente}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Aguardando {tempoEspera}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onAtender(atendimento.id, atendimento.nomePaciente)}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
              isUrgente
                ? "bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-500 hover:shadow-red-500/40 active:scale-95"
                : "border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:border-violet-400 hover:bg-violet-500/20 active:scale-95"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Concluindo...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{isUrgente ? "CONCLUIR AGORA" : "Concluir"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
