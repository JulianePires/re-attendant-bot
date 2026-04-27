import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Clínica — Autoatendimento",
    template: "%s | Clínica",
  },
  description: "Sistema de Autoatendimento e Gestão de Fila em Tempo Real",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning é necessário porque o next-themes injeta
    // o atributo `class` (dark/light) no <html> via script no cliente,
    // causando diferença entre o HTML do servidor e o do cliente.
    <html lang="pt-BR" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/*
          Ordem dos providers (de fora para dentro):
          1. ThemeProvider — lê localStorage e injeta classe dark/light no DOM.
          2. QueryProvider — disponibiliza o cache do TanStack Query para toda a árvore.
        */}
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <QueryProvider>
            {children}
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
