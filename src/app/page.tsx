"use client";

// ================================================================
// Tela de Standby — "/" (raiz do totem)
//
// Esta é a tela principal do kiosk. Exibida em loop quando nenhum
// paciente está interagindo. Dois princípios guiam o design:
//
// 1. ACESSIBILIDADE EXTREMA: botões gigantes, contraste alto e
//    aria-labels descritivos para usuários com baixa acuidade visual.
//
// 2. AFFORDANCE CLARA: o paciente nunca deve ter dúvida sobre o que
//    tocar. Por isso há apenas duas ações possíveis na tela inicial.
//
// O layout kiosk (gradiente, sem scroll, select-none) é aplicado
// inline aqui — o route group (tablet) cuidará das sub-páginas
// futuras (/fila, /sucesso, etc.).
// ================================================================

import { KioskInteractionFlow } from "@/components/tablet/KioskInteractionFlow";
import { LottieBot } from "@/components/tablet/LottieBot";
import { VoiceGreeter } from "@/components/tablet/VoiceGreeter";
import { Suspense } from "react";

export default function TabletStandbyPage() {
  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      {/* Background radial gradient sutil estilo Dark Mode puro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/10 via-zinc-950 to-zinc-950"></div>

      {/* Luzes decorativas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-indigo-600/10 blur-3xl"
      />

      {/* Client Components atomicos isolam TTS, animacao e interacao */}
      <Suspense fallback={null}>
        <VoiceGreeter />
      </Suspense>

      <main className="relative z-10 flex h-full w-full flex-col items-center gap-6 px-6 py-8">
        <div className="flex animate-in flex-col items-center gap-4 duration-700 zoom-in-95 fade-in">
          <LottieBot tamanho="md" />
        </div>

        <section className="flex w-full flex-1 flex-col items-center justify-center">
          <KioskInteractionFlow />
        </section>
      </main>
    </div>
  );
}
