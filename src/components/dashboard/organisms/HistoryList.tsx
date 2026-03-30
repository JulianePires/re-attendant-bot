"use client";

import { ATENDIMENTOS_DIA_QUERY_KEY } from "@/hooks/useRealtimeQueue";
import { arquivarAtendimentosDoTurno, obterAtendimentosDoDia } from "@/server/actions/atendimento";
import type { AtendimentoNaFila } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CartaoHistorico } from "../molecules";
import { CarregandoPlaceholder, ErroPlaceholder, VazioPlaceholder } from "./Placeholders";

const LIMITE_PADRAO = 3;

export function HistoryList() {
  const [limite, setLimite] = useState(LIMITE_PADRAO);
  const queryClient = useQueryClient();

  const {
    data: atendimentos = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ATENDIMENTOS_DIA_QUERY_KEY,
    queryFn: obterAtendimentosDoDia,
  });

  const itensVisiveis = useMemo(() => atendimentos.slice(0, limite), [atendimentos, limite]);

  const podeCarregarMais = atendimentos.length > limite;

  const { mutate: limparTela, isPending: limpandoTela } = useMutation({
    mutationFn: arquivarAtendimentosDoTurno,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ATENDIMENTOS_DIA_QUERY_KEY });
      const anterior =
        queryClient.getQueryData<AtendimentoNaFila[]>(ATENDIMENTOS_DIA_QUERY_KEY) ?? [];
      queryClient.setQueryData<AtendimentoNaFila[]>(ATENDIMENTOS_DIA_QUERY_KEY, []);
      return { anterior };
    },
    onError: (_error, _variables, context) => {
      if (context?.anterior) {
        queryClient.setQueryData<AtendimentoNaFila[]>(ATENDIMENTOS_DIA_QUERY_KEY, context.anterior);
      }
      toast.error("Não foi possível limpar os atendimentos desta tela.");
    },
    onSuccess: (resultado) => {
      toast.success(`${resultado.totalArquivados} atendimento(s) arquivado(s) no turno atual.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ATENDIMENTOS_DIA_QUERY_KEY });
    },
  });

  const renderizaComponentePorStatus = () => {
    if (isError) {
      return <ErroPlaceholder mensagem="Não foi possível carregar o histórico." />;
    }
    if (isLoading) {
      return <CarregandoPlaceholder mensagem="Carregando atendimentos do turno..." />;
    }
    if (atendimentos.length === 0) {
      return <VazioPlaceholder mensagem="Nenhum atendimento finalizado no turno atual." />;
    }
    return (
      <div className="space-y-3">
        {itensVisiveis.map((atendimento: AtendimentoNaFila, index: number) => (
          <CartaoHistorico key={index} atendimento={atendimento} />
        ))}
      </div>
    );
  };

  return (
    <section aria-labelledby="titulo-historico" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="titulo-historico" className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          Finalizados no Turno
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
            {atendimentos.length}
          </span>
        </h2>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={limpandoTela || atendimentos.length === 0}>
              {limpandoTela ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Limpar Tela
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar atendimentos finalizados desta tela?</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja limpar os atendimentos finalizados desta tela? Eles continuarão disponíveis
                no Histórico Geral.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => limparTela()} variant="destructive">
                Sim, limpar tela
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {renderizaComponentePorStatus()}

      {podeCarregarMais && (
        <button
          type="button"
          onClick={() => setLimite((prev) => prev + LIMITE_PADRAO)}
          className="w-full rounded-xl border border-zinc-800/50 bg-zinc-950/60 px-4 py-2 text-sm font-semibold text-zinc-300 shadow-xl backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:border-violet-500/50 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none active:scale-95"
        >
          Ver mais
        </button>
      )}
    </section>
  );
}
