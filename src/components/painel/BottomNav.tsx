"use client";

import { Home, Users, Clock, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/painel", icon: Home, label: "Início" },
  { href: "/painel/historico", icon: Clock, label: "Histórico" },
  { href: "/painel/equipe", icon: Users, label: "Gerenciamento" },
  { href: "/painel/usuarios", icon: UserCircle, label: "Usuários" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-around px-4 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300",
                isActive ? "text-violet-400" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {/* Ícone */}
              <div className="relative">
                <Icon className="h-6 w-6" />
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </div>

              {/* Label */}
              <span className="text-[10px] font-medium">{item.label}</span>

              {/* Glow effect on hover */}
              {isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 -z-10 rounded-lg bg-violet-500/10"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
