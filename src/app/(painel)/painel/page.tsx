"use client";

import { Clock, CheckCircle2, AlertCircle, User } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AtendimentoNaFila, TipoChamadaValue } from "@/types";
import { cn } from "@/lib/utils";
import {
  obterFilaAtiva,
  obterAtendimentosDoDia,
  finalizarAtendimento,
} from "@/server/actions/atendimento";
import {
  useRealtimeQueue,
  FILA_ATIVA_QUERY_KEY,
  ATENDIMENTOS_DIA_QUERY_KEY,
} from "@/hooks/useRealtimeQueue";

// ================================================================
// Subcomponentes
// ================================================================

function BadgeTipo({ tipo }: { tipo: TipoChamadaValue }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tipo === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
      )}
    >
      {tipo === "urgente" && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
      {tipo === "urgente" ? "Urgente" : "Normal"}
    </span>
  );
}

function CartaoFila({
  item,
  onAtender,
  isLoading,
}: {
  item: AtendimentoNaFila & { posicao: number };
  onAtender: (id: string) => void;
  isLoading: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        item.tipoChamada === "urgente" && "border-red-200 bg-red-50/50"
      )}
    >
      {/* Posição na fila */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          item.tipoChamada === "urgente" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
        )}
        aria-label={`Posição ${item.posicao} na fila`}
      >
        {item.posicao}
      </div>

      {/* Dados do paciente */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-slate-800">
          {item.paciente?.name ?? "Paciente"}
        </p>
        <div className="flex items-center gap-2">
          <BadgeTipo tipo={item.tipoChamada} />
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatarHorario(item.criadoEm)}
          </span>
        </div>
      </div>

      {/* Ação — será ligada ao Server Action de chamada */}
      <button
        className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-blue-300"
        aria-label={`Chamar ${item.paciente?.name ?? "Paciente"}`}
        onClick={() => onAtender(item.id)}
        disabled={isLoading}
      >
        {isLoading ? "Atendendo..." : "Atender"}
      </button>
    </li>
  );
}

function CartaoHistorico({ atendimento }: { atendimento: AtendimentoNaFila }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-white p-3.5 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-slate-700">
          {atendimento.paciente?.name ?? "Paciente"}
        </p>
        <div className="flex items-center gap-2">
          <BadgeTipo tipo={atendimento.tipoChamada} />
          <span className="text-xs text-slate-400">
            {formatarHorario(atendimento.finalizadoEm)}
          </span>
        </div>
      </div>
    </li>
  );
}

function formatarHorario(valor: Date | string | null | undefined) {
  if (!valor) return "--:--";
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ================================================================
// Dashboard principal
// ================================================================

export default function PainelDashboardPage() {
  const queryClient = useQueryClient();

  const {
    data: filaAtiva = [],
    isLoading: filaLoading,
    isError: filaError,
  } = useQuery({
    queryKey: FILA_ATIVA_QUERY_KEY,
    queryFn: obterFilaAtiva,
  });

  const {
    data: atendimentosDia = [],
    isLoading: historicoLoading,
    isError: historicoError,
  } = useQuery({
    queryKey: ATENDIMENTOS_DIA_QUERY_KEY,
    queryFn: obterAtendimentosDoDia,
  });

  useRealtimeQueue(queryClient);

  const finalizarMutation = useMutation({
    mutationFn: (atendimentoId: string) => finalizarAtendimento(atendimentoId),
    // Otimismo: removemos da fila antes do servidor responder para manter o painel fluido.
    onMutate: async (atendimentoId) => {
      await queryClient.cancelQueries({ queryKey: FILA_ATIVA_QUERY_KEY });
      const anterior = queryClient.getQueryData<AtendimentoNaFila[]>(FILA_ATIVA_QUERY_KEY) ?? [];

      queryClient.setQueryData<AtendimentoNaFila[]>(FILA_ATIVA_QUERY_KEY, (old = []) =>
        old.filter((item) => item.id !== atendimentoId)
      );

      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) {
        queryClient.setQueryData(FILA_ATIVA_QUERY_KEY, contexto.anterior);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FILA_ATIVA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATENDIMENTOS_DIA_QUERY_KEY });
    },
  });

  const totalHoje = atendimentosDia.length;
  const urgentesHoje = atendimentosDia.filter((a) => a.tipoChamada === "urgente").length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie a fila e acompanhe os atendimentos do dia
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Na fila</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{filaAtiva.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Atendidos hoje
          </p>
          <p className="mt-1 text-3xl font-bold text-green-600">{totalHoje}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Urgências hoje
          </p>
          <p className="mt-1 text-3xl font-bold text-red-500">{urgentesHoje}</p>
        </div>
      </div>

      {/* Corpo: duas colunas — Fila de espera | Histórico do dia */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Fila de Espera ── */}
        <section aria-labelledby="titulo-fila">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="titulo-fila"
              className="flex items-center gap-2 text-base font-semibold text-slate-800"
            >
              <User className="h-4 w-4 text-blue-500" aria-hidden="true" />
              Fila de Espera
              {/* Badge com contagem — ficará reativo ao Realtime */}
              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                {filaAtiva.length}
              </span>
            </h2>
            <span className="text-xs text-slate-400">
              {filaLoading ? "Atualizando..." : "Em tempo real"}
            </span>
          </div>

          {filaError ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-slate-400">
              <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
              <p className="text-sm">Erro ao carregar a fila ativa</p>
            </div>
          ) : filaLoading ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-slate-400">
              <Clock className="mb-2 h-8 w-8" />
              <p className="text-sm">Carregando fila...</p>
            </div>
          ) : filaAtiva.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-slate-400">
              <CheckCircle2 className="mb-2 h-8 w-8 text-green-400" />
              <p className="text-sm">Fila vazia — nenhum paciente aguardando</p>
            </div>
          ) : (
            <ul className="space-y-2.5" aria-label="Pacientes aguardando atendimento">
              {filaAtiva.map((item, index) => (
                <CartaoFila
                  key={item.id}
                  item={{ ...item, posicao: index + 1 }}
                  onAtender={(id) => finalizarMutation.mutate(id)}
                  isLoading={finalizarMutation.isPending}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ── Atendimentos do Dia ── */}
        <section aria-labelledby="titulo-historico">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="titulo-historico"
              className="flex items-center gap-2 text-base font-semibold text-slate-800"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
              Atendimentos do Dia
              <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                {totalHoje}
              </span>
            </h2>
          </div>

          {historicoError ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-slate-400">
              <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
              <p className="text-sm">Erro ao carregar atendimentos do dia</p>
            </div>
          ) : historicoLoading ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-slate-400">
              <Clock className="mb-2 h-8 w-8" />
              <p className="text-sm">Carregando atendimentos...</p>
            </div>
          ) : atendimentosDia.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-slate-400">
              <Clock className="mb-2 h-8 w-8" />
              <p className="text-sm">Nenhum atendimento finalizado ainda</p>
            </div>
          ) : (
            <ul className="space-y-2.5" aria-label="Atendimentos finalizados hoje">
              {atendimentosDia.map((atendimento) => (
                <CartaoHistorico key={atendimento.id} atendimento={atendimento} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
