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
    <div className="relative flex flex-col items-center justify-center">
      {/* Container dos olhos e sobrancelhas */}
      <div className="relative mt-20 mb-32 flex items-center gap-48">
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

      {/* Boca */}
      <div className="mt-16">
        <RobotMouth isTalking={isTalking} />
      </div>

      {/* Decorações adicionais - Círculos de "bochecha" */}
      <motion.div
        className="absolute top-64 left-40 h-12 w-12 rounded-full bg-pink-300/40"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-64 right-40 h-12 w-12 rounded-full bg-pink-300/40"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut",
          delay: 1.5,
        }}
      />
    </div>
  );
}
