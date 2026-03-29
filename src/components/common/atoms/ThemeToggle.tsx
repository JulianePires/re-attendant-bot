"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeState } from "@/components/providers/theme-provider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useThemeState();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "border-border/70 bg-card/60 text-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
        "hover:border-primary/60 transition-all duration-300 ease-in-out",
        className
      )}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? "Modo Claro" : "Modo Escuro"}
    </button>
  );
}
