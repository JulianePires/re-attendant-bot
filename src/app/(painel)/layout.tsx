import type { Metadata } from "next";
import { Sidebar } from "@/components/painel/Sidebar";
import { Header } from "@/components/painel/Header";

export const metadata: Metadata = {
  title: "Painel",
};

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    // h-screen + overflow-hidden: garante que apenas o <main> role, não a página inteira
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      {/* Coluna direita: Header fixo + área de conteúdo rolável */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
