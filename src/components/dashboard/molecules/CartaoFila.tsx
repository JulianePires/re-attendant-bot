import { cn } from "@/lib/utils";
import type { AtendimentoNaFila } from "@/types";
import { Clock, Loader2, User } from "lucide-react";
import { BadgeTipo } from "../atoms";

export function CartaoFila({
  item,
  onAtender,
  isLoading,
}: {
  item: AtendimentoNaFila & { posicao: number };
  onAtender: (id: string) => void;
  isLoading: boolean;
}) {
  const isUrgente = item.tipoChamada === "urgente";
  return (
    <li
      className={cn(
        "relative flex items-center gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-950/60 p-5 shadow-xl backdrop-blur-md",
        "cursor-default transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-950 hover:-translate-y-1 hover:scale-[1.02] active:scale-95",
        "animate-in duration-500 fill-mode-both fade-in slide-in-from-bottom-4",
        isUrgente
          ? "animate-pulse border-red-500/50 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]"
          : "hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(124,58,237,0.1)]"
      )}
      tabIndex={0}
      aria-label={`Paciente ${item.nomePaciente ?? "Desconhecido"}, posição ${item.posicao}${isUrgente ? ", urgente" : ""}`}
    >
      {/* Posição na fila */}
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-lg font-bold",
          isUrgente
            ? "border-red-500/30 bg-red-500/10 text-red-500"
            : "border-violet-500/30 bg-violet-500/10 text-violet-400"
        )}
        aria-label={`Posição ${item.posicao} na fila`}
      >
        {item.posicao}
      </div>

      {/* Dados do paciente */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-violet-400" aria-hidden="true" />
          <span className="text-foreground truncate text-base font-semibold">
            {item.nomePaciente ?? "Paciente"}
          </span>

          <BadgeTipo tipo={item.tipoChamada} />
        </div>

        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span>{formatarHorario(item.criadoEm)}</span>
        </span>
      </div>

      <button
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white transition-all duration-300 ease-out",
          "hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none",
          isUrgente
            ? "bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] focus-visible:ring-red-500"
            : "bg-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.3)] hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] focus-visible:ring-violet-500",
          "disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100"
        )}
        aria-label={`Chamar paciente ${item.nomePaciente ?? "Paciente"}`}
        onClick={() => onAtender(item.id)}
        disabled={isLoading}
        type="button"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoading ? "Atendendo..." : "Atender"}
      </button>
    </li>
  );
}

function formatarHorario(valor: Date | string | null | undefined) {
  if (!valor) return "--:--";
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
