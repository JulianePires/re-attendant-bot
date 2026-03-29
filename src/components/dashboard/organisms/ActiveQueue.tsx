"use client";

import {
  ATENDIMENTOS_DIA_QUERY_KEY,
  FILA_ATIVA_QUERY_KEY,
  useRealtimeQueue,
} from "@/hooks/useRealtimeQueue";
import { finalizarAtendimento, obterFilaAtiva } from "@/server/actions/atendimento";
import type { AtendimentoNaFila } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, User } from "lucide-react";
import { useMemo } from "react";
import { CartaoFila } from "../molecules";
import { CarregandoPlaceholder, ErroPlaceholder, VazioPlaceholder } from "./Placeholders";

export function ActiveQueue() {
  const queryClient = useQueryClient();

  const {
    data: filaAtiva = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: FILA_ATIVA_QUERY_KEY,
    queryFn: obterFilaAtiva,
  });

  useRealtimeQueue();

  const finalizarMutation = useMutation({
    mutationFn: (atendimentoId: string) => finalizarAtendimento(atendimentoId),
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

  const filaComPosicao = useMemo(
    () => filaAtiva.map((item, index) => ({ ...item, posicao: index + 1 })),
    [filaAtiva]
  );

  const handleAtender = (atendimentoId: string) => {
    finalizarMutation.mutate(atendimentoId);
  };

  const renderComponentByStatus = () => {
    if (isError) {
      return <ErroPlaceholder mensagem="Não foi possível carregar a fila ativa." />;
    }
    if (isLoading) {
      return <CarregandoPlaceholder mensagem="Carregando fila ativa..." />;
    }
    if (filaAtiva.length === 0) {
      return <VazioPlaceholder mensagem="Nenhum paciente na fila." />;
    }
    return (
      <div className="space-y-3">
        {filaComPosicao.map((item) => {
          return (
            <CartaoFila key={item.id} item={item} onAtender={handleAtender} isLoading={isLoading} />
          );
        })}
      </div>
    );
  };

  return (
    <section aria-labelledby="titulo-fila" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="titulo-fila" className="flex items-center gap-2 text-lg font-semibold">
          <User className="h-5 w-5 text-violet-400" aria-hidden="true" />
          Fila Ativa
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300">
            {filaAtiva.length}
          </span>
        </h2>
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <Activity className="h-3 w-3 text-violet-400" />
              Em tempo real
            </>
          )}
        </span>
      </div>

      {renderComponentByStatus()}
    </section>
  );
}
