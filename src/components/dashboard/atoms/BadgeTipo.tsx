import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TipoChamadaValue } from "@/types";

export function BadgeTipo({ tipo }: { tipo: TipoChamadaValue }) {
  const isUrgente = tipo === "urgente";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isUrgente
          ? "animate-pulse bg-red-500/10 text-red-500"
          : "border border-violet-700/60 bg-violet-900/60 text-violet-300 backdrop-blur-md",
        "transition-all duration-300 ease-out"
      )}
      tabIndex={0}
      aria-label={isUrgente ? "Urgente" : "Normal"}
    >
      {isUrgente && <AlertCircle className="h-3 w-3 text-red-400" aria-hidden="true" />}
      {isUrgente ? "Urgente" : "Normal"}
    </span>
  );
}
