import { cn } from "@/lib/utils";
import type { AtendimentoNaFila } from "@/types";
import { CheckCircle2, Clock } from "lucide-react";
import { BadgeTipo } from "../atoms";

export function CartaoHistorico({ atendimento }: { atendimento: AtendimentoNaFila }) {
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-4 shadow-xl",
        "border-zinc-800/50 bg-zinc-950/60 backdrop-blur-md hover:border-violet-500/30",
        "cursor-default transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] active:scale-95",
        "animate-in duration-500 fill-mode-both fade-in slide-in-from-bottom-4 focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-950"
      )}
      tabIndex={0}
      aria-label={`Paciente ${atendimento.paciente?.name ?? "Desconhecido"}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-foreground truncate text-base font-semibold">
            {atendimento.paciente?.name ?? "Paciente"}
          </p>
          <BadgeTipo tipo={atendimento.tipoChamada} />
        </div>

        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span>{formatarHorario(atendimento.finalizadoEm)}</span>
        </span>
      </div>
    </li>
  );
}

function formatarHorario(valor: Date | string | null | undefined) {
  if (!valor) return "--:--";
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
