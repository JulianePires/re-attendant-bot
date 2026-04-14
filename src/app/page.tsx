"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RobotFaceContainer } from "@/components/tablet/RobotFaceContainer";
import { KioskInteractionFlow } from "@/components/tablet/KioskInteractionFlow";

/**
 * Tela principal do Totem de Autoatendimento
 *
 * Layout: Rosto de robô amigável em tela cheia com animações
 * Interação: Botões nos cantos inferiores para iniciar atendimento
 */
export default function TabletPage() {
  const [isTalking, setIsTalking] = useState(false);

  return (
    <div className="bg-gradient-radial relative h-screen w-screen overflow-hidden from-slate-100 via-slate-50 to-white">
      {/* Elementos decorativos de fundo */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute top-10 left-10 h-32 w-32 rounded-full bg-blue-200/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute right-10 bottom-10 h-40 w-40 rounded-full bg-violet-200/20 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

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
      <div className="absolute top-6 right-6 flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-lg backdrop-blur-sm">
        <motion.div
          className="h-3 w-3 rounded-full bg-emerald-500"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
          }}
        />
        <span className="text-sm font-medium text-slate-700">Sistema Online</span>
      </div>
    </div>
  );
}
