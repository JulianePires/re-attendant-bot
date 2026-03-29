"use client";

import { ActiveQueue, HistoryList, ResumoCard } from "@/components/dashboard/organisms";
import { ATENDIMENTOS_DIA_QUERY_KEY, FILA_ATIVA_QUERY_KEY } from "@/hooks/useRealtimeQueue";
import { obterAtendimentosDoDia, obterFilaAtiva } from "@/server/actions/atendimento";
import { marcarTodasComoLidas } from "@/server/actions/notificacoes";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

// ================================================================
// Dashboard principal
// ================================================================

export default function PainelDashboardPage() {
  useEffect(() => {
    marcarTodasComoLidas().catch(() => {
      // Silencia erro para não interromper o carregamento do dashboard.
    });
  }, []);

  const { data: filaAtiva = [] } = useQuery({
    queryKey: FILA_ATIVA_QUERY_KEY,
    queryFn: obterFilaAtiva,
  });

  const { data: atendimentosDia = [] } = useQuery({
    queryKey: ATENDIMENTOS_DIA_QUERY_KEY,
    queryFn: obterAtendimentosDoDia,
  });

  const totalHoje = atendimentosDia.length;
  const urgentesHoje = atendimentosDia.filter((a) => a.tipoChamada === "urgente").length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie a fila e acompanhe os atendimentos do dia
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <ResumoCard cor="violet" titulo="Na fila" valor={filaAtiva.length} />
        <ResumoCard cor="emerald" titulo="Atendidos hoje" valor={totalHoje} />
        <ResumoCard cor="red" titulo="Urgências hoje" valor={urgentesHoje} />
      </div>

      {/* Corpo: duas colunas — Fila de espera | Histórico do dia */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Fila de Espera ── */}
        <ActiveQueue />

        {/* ── Atendimentos do Dia ── */}
        <HistoryList />
      </div>
    </div>
  );
}
