import { AlertCircle, Loader2, FileQuestion } from "lucide-react";

export function ErroPlaceholder({ mensagem }: { mensagem: string }) {
  return (
    <div
      className="flex h-48 animate-in flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-red-500/30 bg-zinc-950/60 text-red-400 shadow-xl backdrop-blur-md duration-500 fade-in slide-in-from-bottom-4"
      tabIndex={0}
      aria-label={mensagem}
    >
      <AlertCircle className="h-7 w-7 shadow-[0_0_20px_rgba(239,68,68,0.4)]" aria-hidden="true" />
      <p className="text-sm font-medium">{mensagem}</p>
    </div>
  );
}

export function CarregandoPlaceholder({ mensagem }: { mensagem: string }) {
  return (
    <div
      className="flex h-48 animate-in flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-violet-500/30 bg-zinc-950/60 text-violet-400 shadow-xl backdrop-blur-md duration-500 fade-in slide-in-from-bottom-4"
      tabIndex={0}
      aria-label={mensagem}
    >
      <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
      <p className="animate-pulse text-sm font-medium">{mensagem}</p>
    </div>
  );
}

export function VazioPlaceholder({ mensagem }: { mensagem: string }) {
  return (
    <div
      className="flex h-48 animate-in flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-800/50 bg-zinc-950/60 text-zinc-400 shadow-xl backdrop-blur-md duration-500 fade-in slide-in-from-bottom-4"
      tabIndex={0}
      aria-label={mensagem}
    >
      <FileQuestion className="h-7 w-7 opacity-70" aria-hidden="true" />
      <p className="text-sm font-medium">{mensagem}</p>
    </div>
  );
}
