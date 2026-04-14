"use client";

import { Maximize, Minimize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "./NotificationBell";
import { SignOutButton } from "./SignOutButton";

interface PainelHeaderProps {
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  isFullscreen?: boolean;
}

export function PainelHeader({ onFullscreenToggle, isFullscreen = false }: PainelHeaderProps) {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        onFullscreenToggle?.(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        onFullscreenToggle?.(false);
      });
    }
  };

  return (
    <AnimatePresence>
      {!isFullscreen && (
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-500/20">
                <span className="text-lg font-bold text-white">AC</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-100">Atendimentos</h1>
                <p className="text-xs text-slate-400">Painel de Controle</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="group relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 transition-all hover:border-violet-500/50 hover:bg-slate-800 hover:text-violet-400 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <NotificationBell />

              {/* Sign Out */}
              <SignOutButton />
            </div>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
