import { Suspense } from "react";
import { VoiceGreeter } from "@/components/tablet/VoiceGreeter";
import { LottieBot } from "@/components/tablet/LottieBot";
import { KioskInteractionFlow } from "@/components/tablet/KioskInteractionFlow";

export default function TabletPage() {
  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      {/* Background radial gradient sutil estilo Dark Mode puro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-violet-900/10 via-zinc-950 to-zinc-950"></div>

      {/* Luzes decorativas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 h-112 w-md rounded-full bg-violet-600/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -bottom-40 h-112 w-md rounded-full bg-indigo-600/10 blur-3xl"
      />

      {/* Client Components atomicos isolam TTS, animacao e interacao */}
      <Suspense fallback={null}>
        <VoiceGreeter />
      </Suspense>

      <main className="relative z-10 flex h-full w-full flex-col items-center gap-4 px-4 py-4">
        <div className="flex animate-in flex-col items-center gap-2 duration-700 zoom-in-95 fade-in">
          <LottieBot tamanho="sm" />
        </div>

        <section className="flex w-full flex-1 flex-col items-center justify-center">
          <KioskInteractionFlow />
        </section>
      </main>
    </div>
  );
}
