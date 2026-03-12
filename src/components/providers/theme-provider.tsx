"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// Re-exporta o ThemeProvider do next-themes como Client Component.
// Necessário porque o next-themes depende de APIs do browser
// (localStorage, matchMedia) e não pode ser renderizado no servidor.
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
