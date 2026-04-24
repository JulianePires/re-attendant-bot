"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RobotFaceContainer } from "@/components/tablet/RobotFaceContainer";
import { KioskInteractionFlow } from "@/components/tablet/KioskInteractionFlow";
import { Maximize, Minimize } from "lucide-react";

/**
 * Tela principal do Totem de Autoatendimento
 *
 * Layout: Rosto de robô amigável em tela cheia com animações
 * Interação: Botões nos cantos inferiores para iniciar atendimento
 */
export default function TabletPage() {
  const [isTalking, setIsTalking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-linear-125 from-sky-500 via-sky-400 to-sky-600">
      {/* Rosto do Robô - Centralizado */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <RobotFaceContainer isTalking={isTalking} />
      </motion.div>

      {/* Fluxo de Interação - Sempre visível */}
      <KioskInteractionFlow handleToggleTalking={setIsTalking} />

      {/* Indicador de status no canto superior direito */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="group relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 transition-all hover:border-violet-500/50 hover:bg-slate-800 hover:text-violet-400 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
