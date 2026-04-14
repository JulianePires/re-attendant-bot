"use client";

import { motion } from "framer-motion";
import { AlertCircle, Play } from "lucide-react";

interface KioskActionButtonsProps {
  onUrgent: () => void;
  onStart: () => void;
}

/**
 * Botões de ação do kiosk posicionados nos cantos inferiores
 */
export function KioskActionButtons({ onUrgent, onStart }: KioskActionButtonsProps) {
  return (
    <>
      {/* Botão URGENTE - Canto Inferior Esquerdo */}
      <motion.button
        onClick={onUrgent}
        className="group absolute bottom-12 left-12 flex items-center gap-4 rounded-2xl bg-linear-to-r from-red-600 to-red-700 px-8 py-6 text-white shadow-[0_8px_32px_rgba(220,38,38,0.4)] transition-all hover:shadow-[0_12px_40px_rgba(220,38,38,0.6)]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
        >
          <AlertCircle className="h-10 w-10" />
        </motion.div>
        <div className="flex flex-col items-start">
          <span className="text-2xl font-bold">URGENTE</span>
          <span className="text-sm opacity-90">Atendimento prioritário</span>
        </div>
      </motion.button>

      {/* Botão COMEÇAR - Canto Inferior Direito */}
      <motion.button
        onClick={onStart}
        className="group absolute right-12 bottom-12 flex items-center gap-4 rounded-2xl bg-linear-to-r from-blue-600 to-blue-700 px-8 py-6 text-white shadow-[0_8px_32px_rgba(37,99,235,0.4)] transition-all hover:shadow-[0_12px_40px_rgba(37,99,235,0.6)]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <div className="flex flex-col items-start">
          <span className="text-2xl font-bold">COMEÇAR</span>
          <span className="text-sm opacity-90">Entrar na fila</span>
        </div>
        <Play className="h-10 w-10 fill-white" />
      </motion.button>
    </>
  );
}
