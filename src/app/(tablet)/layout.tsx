import type { Metadata } from "next";

// ================================================================
// Layout Kiosk — Tablet do Paciente
//
// Decisões de UX/UI para modo totem:
// - overflow-hidden: impede scroll acidental por toque
// - select-none: evita seleção de texto por toque impreciso
// - pointer-events controlados: apenas elementos interativos recebem toque
// - Gradiente suave (sky → indigo) cria ambiente acolhedor sem ser
//   clínico/frio, reduzindo ansiedade do paciente
// - Decorações absolutas com blur criam profundidade sem distrair
//
// Para kiosk real em produção, combine com:
//   - Modo quiosque do Chrome (--kiosk flag)
//   - CSS: html { touch-action: none } para desabilitar gestos do browser
// ================================================================

export const metadata: Metadata = {
  title: "Autoatendimento",
  description: "Totem de autoatendimento da clínica",
};

export default function TabletLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      // overflow-hidden impede que o paciente role para fora da tela
      // select-none evita seleção de texto em toques longos acidentais
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 select-none"
    >
      {/* Manchas de cor difusas — criam sensação de ambiente iluminado */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-sky-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-indigo-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-2xl"
      />

      {/* Conteúdo da rota — posicionado acima das decorações */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
