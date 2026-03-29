import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ActionCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  tabIndex?: number;
  ariaLabel?: string;
}

export function ActionCard({ children, className, style, tabIndex, ariaLabel }: ActionCardProps) {
  return (
    <div
      className={cn(
        "border-border/70 bg-card/60 rounded-2xl border p-5 shadow-lg shadow-black/20",
        "transition-all duration-300 ease-in-out",
        className
      )}
      style={style}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
