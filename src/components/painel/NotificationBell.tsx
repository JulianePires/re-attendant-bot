"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  marcarComoLida,
  marcarTodasComoLidas,
  obterNotificacoes,
} from "@/server/actions/notificacoes";
import { useNotificationListener } from "@/hooks/useNotificationListener";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_ROUTES } from "@/lib/constants";
import { toast } from "sonner";

type NotificacaoItem = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "URGENTE" | "NORMAL";
  lida: boolean;
  criadoEm: Date;
};

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  useNotificationListener();

  const { data: notificacoes = [] } = useQuery<NotificacaoItem[]>({
    queryKey: ["notificacoes"],
    queryFn: obterNotificacoes,
    staleTime: 0, // Sempre buscar dados frescos
    refetchInterval: 5000, // Refetch a cada 5s como fallback do Realtime
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false, // Só refetch quando aba está ativa
  });

  const totalNaoLidas = useMemo(
    () => notificacoes.filter((item) => !item.lida).length,
    [notificacoes]
  );

  const marcarComoLidaMutation = useMutation({
    mutationFn: (id: string) => marcarComoLida(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      setIsOpen(false);
      router.push(APP_ROUTES.DASHBOARD);
    },
    onError: () => {
      toast.error("Não foi possível atualizar a notificação.");
    },
  });

  const marcarTodasMutation = useMutation({
    mutationFn: marcarTodasComoLidas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Todas as notificações foram marcadas como lidas.");
    },
    onError: () => {
      toast.error("Não foi possível marcar todas como lidas.");
    },
  });

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="text-muted-foreground hover:bg-muted hover:text-foreground relative rounded-lg p-2 transition-all duration-300 ease-in-out"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {totalNaoLidas > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
              {totalNaoLidas > 99 ? "99+" : totalNaoLidas}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="z-1000 w-[24rem] bg-slate-50 p-0 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
          <button
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-500 transition-colors hover:text-violet-400 disabled:opacity-50"
            onClick={() => marcarTodasMutation.mutate()}
            disabled={marcarTodasMutation.isPending || totalNaoLidas === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </button>
        </div>

        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-88 overflow-y-auto p-1">
          {notificacoes.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Você não possui notificações.
            </p>
          ) : (
            notificacoes.map((notificacao) => (
              <DropdownMenuItem
                key={notificacao.id}
                className={[
                  "items-start gap-3 p-3",
                  !notificacao.lida ? "bg-blue-500/10 focus:bg-blue-500/15" : "",
                ].join(" ")}
                onClick={() => {
                  if (notificacao.lida) {
                    setIsOpen(false);
                    router.push(APP_ROUTES.DASHBOARD);
                    return;
                  }

                  marcarComoLidaMutation.mutate(notificacao.id);
                }}
                disabled={marcarComoLidaMutation.isPending}
              >
                <span
                  className={[
                    "mt-1.5 h-2 w-2 rounded-full",
                    !notificacao.lida ? "bg-blue-500" : "bg-transparent",
                  ].join(" ")}
                  aria-hidden="true"
                />

                <div className="space-y-1">
                  <p className="text-foreground text-sm font-semibold">{notificacao.titulo}</p>
                  <p className="text-muted-foreground text-xs">{notificacao.mensagem}</p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
