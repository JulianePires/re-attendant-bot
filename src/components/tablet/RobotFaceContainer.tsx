"use client";

import { motion } from "framer-motion";
import { RobotEye, RobotEyebrow, RobotMouth, useRobotFaceAnimation } from "./RobotFace";

interface RobotFaceContainerProps {
  isTalking?: boolean;
}

/**
 * Componente principal do rosto do robô
 * Renderiza olhos, sobrancelhas e boca com animações sincronizadas
 */
export function RobotFaceContainer({ isTalking = false }: RobotFaceContainerProps) {
  const { eyePosition, isBlinking } = useRobotFaceAnimation();

  return (
    <div className="relative flex flex-col items-center justify-center px-24 pt-16 pb-16">
      {/* ── Conteúdo do rosto ── */}

      {/* Olhos e sobrancelhas */}
      <div className="relative mt-20 flex items-center gap-48">
        {/* Olho Esquerdo com Sobrancelha */}
        <div className="relative">
          <RobotEyebrow position={eyePosition} side="left" />
          <RobotEye position={eyePosition} isBlinking={isBlinking} />
        </div>

        {/* Olho Direito com Sobrancelha */}
        <div className="relative">
          <RobotEyebrow position={eyePosition} side="right" />
          <RobotEye position={eyePosition} isBlinking={isBlinking} />
        </div>
      </div>

      {/* Bochechas rosadas */}
      <motion.div
        className="pointer-events-none absolute h-28 w-28 rounded-full"
        style={{
          bottom: "22%",
          left: "10%",
          background: "radial-gradient(circle, rgba(251,113,133,0.28) 0%, transparent 70%)",
          filter: "blur(12px)",
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute h-28 w-28 rounded-full"
        style={{
          bottom: "22%",
          right: "10%",
          background: "radial-gradient(circle, rgba(251,113,133,0.28) 0%, transparent 70%)",
          filter: "blur(12px)",
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Boca */}
      <div className="mt-4">
        <RobotMouth isTalking={isTalking} />
      </div>
    </div>
  );
}
