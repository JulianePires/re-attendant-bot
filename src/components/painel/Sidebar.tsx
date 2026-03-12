"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Users, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const itensNav = [
  {
    href: "/painel",
    label: "Dashboard",
    icone: LayoutDashboard,
  },
  {
    href: "/painel/historico",
    label: "Histórico",
    icone: History,
  },
  {
    href: "/painel/usuarios",
    label: "Usuários",
    icone: Users,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Identidade da aplicação */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Stethoscope className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-slate-800">Clínica Painel</span>
      </div>

      {/* Navegação principal */}
      <nav
        className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4"
        aria-label="Navegação do painel"
      >
        {itensNav.map(({ href, label, icone: Icone }) => {
          // Correspondência exata para /painel evita que Dashboard
          // fique ativo em todas as sub-rotas do painel
          const ativo = href === "/painel" ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                ativo
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icone
                className={cn("h-4 w-4 shrink-0", ativo ? "text-blue-600" : "text-slate-400")}
                aria-hidden="true"
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé da sidebar — versão ou info secundária */}
      <div className="border-t border-slate-200 px-5 py-3">
        <p className="text-xs text-slate-400">v0.1.0 — Beta</p>
      </div>
    </aside>
  );
}
