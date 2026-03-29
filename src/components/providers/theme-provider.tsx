"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ComponentProps } from "react";
import { createContext, useContext, useMemo } from "react";

type ThemeState = {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  isDark: boolean;
  mounted: boolean;
};

const ThemeStateContext = createContext<ThemeState | null>(null);

function ThemeStateProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const mounted = theme !== undefined;

  const isDark = theme === "dark";

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isDark,
      mounted,
      toggleTheme: () => setTheme(isDark ? "light" : "dark"),
    }),
    [theme, setTheme, isDark, mounted]
  );

  return <ThemeStateContext.Provider value={value}>{children}</ThemeStateContext.Provider>;
}

// Re-exporta o ThemeProvider do next-themes como Client Component.
// Necessário porque o next-themes depende de APIs do browser
// (localStorage, matchMedia) e não pode ser renderizado no servidor.
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeStateProvider>{children}</ThemeStateProvider>
    </NextThemesProvider>
  );
}

export function useThemeState() {
  const context = useContext(ThemeStateContext);

  if (!context) {
    throw new Error("useThemeState must be used within ThemeProvider");
  }

  return context;
}
