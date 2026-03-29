import type { Metadata } from "next";

// ================================================================
// Layout Kiosk — Tablet do Paciente
//
// Mantemos o layout mínimo para que cada tela (RSC) controle
// o fundo e a composição visual sem conflito com wrappers.
// ================================================================

export const metadata: Metadata = {
  title: "Autoatendimento",
  description: "Totem de autoatendimento da clínica",
};

export default function TabletLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full overflow-hidden">{children}</div>;
}
