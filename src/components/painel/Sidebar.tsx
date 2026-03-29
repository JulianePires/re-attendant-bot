"use client";

import { APP_ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { History, LayoutDashboard, Stethoscope, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const itensNav = [
  {
    href: APP_ROUTES.DASHBOARD,
    label: "Dashboard",
    icone: LayoutDashboard,
  },
  {
    href: APP_ROUTES.HISTORICO,
    label: "Histórico",
    icone: History,
  },
  {
    href: APP_ROUTES.USUARIOS,
    label: "Usuários",
    icone: Users,
  },
  {
    href: APP_ROUTES.EQUIPE,
    label: "Equipe",
    icone: UserCog,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border bg-background flex h-screen w-64 shrink-0 flex-col border-r">
      {/* Identidade da aplicação */}
      <div className="border-border flex h-16 items-center gap-2.5 border-b px-5">
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
          <Stethoscope className="text-primary-foreground h-4 w-4" aria-hidden="true" />
        </div>
        <span className="text-foreground text-sm font-semibold">Clínica Painel</span>
      </div>

      {/* Navegação principal */}
      <nav
        className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4"
        aria-label="Navegacao do painel"
      >
        {itensNav.map(({ href, label, icone: Icone }) => {
          // Correspondência exata para /painel evita que Dashboard
          // fique ativo em todas as sub-rotas do painel
          const ativo =
            href === APP_ROUTES.DASHBOARD ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out",
                ativo
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icone
                className={cn("h-4 w-4 shrink-0", ativo ? "text-primary" : "text-muted-foreground")}
                aria-hidden="true"
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé da sidebar — versão ou info secundária */}
      <div className="border-border border-t px-5 py-3">
        <p className="text-muted-foreground text-xs">v1.0.0 — Beta</p>
      </div>
    </aside>
  );
}
