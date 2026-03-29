import { cn } from "@/lib/utils";
import type { StatusAtendimentoValue } from "@/types";

interface BadgeStatusProps {
  status: StatusAtendimentoValue;
  className?: string;
}

const styles = {
  aguardando: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  finalizado: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
} as const;

export function BadgeStatus({ status, className }: BadgeStatusProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className
      )}
    >
      {status === "aguardando" ? "Aguardando" : "Finalizado"}
    </span>
  );
}
