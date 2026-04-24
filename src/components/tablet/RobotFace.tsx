"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LottieHandler } from "@/components/common/atoms/LottieHandler";
import Image from "next/image";

/**
 * Hook para gerenciar animações do rosto do robô
 * Controla movimento dos olhos, sobrancelhas e piscar
 */
export function useRobotFaceAnimation() {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    // Animação Idle - Movimento suave dos olhos
    const idleInterval = setInterval(() => {
      // Movimento aleatório suave entre -30 e 30 pixels
      const newX = (Math.random() - 0.5) * 60;
      const newY = (Math.random() - 0.5) * 40;

      setEyePosition({ x: newX, y: newY });
    }, 3000);

    // Piscar aleatório
    const blinkInterval = setInterval(
      () => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      },
      Math.random() * 3000 + 2000
    ); // Entre 2-5 segundos

    return () => {
      clearInterval(idleInterval);
      clearInterval(blinkInterval);
    };
  }, []);

  return { eyePosition, isBlinking };
}

interface RobotEyeProps {
  position: { x: number; y: number };
  isBlinking: boolean;
}

/**
 * Componente de olho do robô com pupila animada
 */
export function RobotEye({ position, isBlinking }: RobotEyeProps) {
  return (
    <motion.div
      className="relative"
      animate={{
        scaleY: isBlinking ? 0.1 : 1,
      }}
      transition={{ duration: 0.1 }}
    >
      {/* Esclera (parte branca) */}
      <div className="relative h-64 w-64 overflow-hidden rounded-full bg-white shadow-[inset_0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(0,0,0,0.15)]">
        {/* Pupila animada */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            x: position.x,
            y: position.y,
          }}
          transition={{
            type: "spring",
            stiffness: 60,
            damping: 15,
          }}
        >
          <div className="relative">
            {/* Íris azul */}
            <div className="relative h-32 w-32 rounded-full bg-linear-to-br from-blue-400 to-blue-600 shadow-lg">
              {/* Pupila */}
              <div className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900" />
              {/* Reflexo */}
              <div className="absolute top-6 left-8 h-6 w-6 rounded-full bg-white/60" />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

interface RobotEyebrowProps {
  position: { x: number; y: number };
  side: "left" | "right";
}

/**
 * Componente de sobrancelha que segue o movimento dos olhos
 */
export function RobotEyebrow({ position, side }: RobotEyebrowProps) {
  // Offset para posicionar acima do olho
  const offsetY = -40;

  return (
    <motion.div
      className="absolute -top-12"
      animate={{
        x: position.x * 0.5, // Movimento mais sutil que os olhos
        y: position.y * 0.3 + offsetY,
      }}
      transition={{
        type: "spring",
        stiffness: 50,
        damping: 15,
      }}
    >
      {side === "left" ? (
        <Image src="/images/left-eyebrow.png" alt="Sobrancelha Esquerda" width={450} height={40} />
      ) : (
        <Image src="/images/right-eyebrow.png" alt="Sobrancelha Direita" width={450} height={40} />
      )}
    </motion.div>
  );
}

interface RobotMouthProps {
  isTalking?: boolean;
}

/**
 * Componente de boca do robô
 */
export function RobotMouth({ isTalking = false }: RobotMouthProps) {
  // Se estiver falando, usa animação Lottie de boca falando
  if (isTalking) {
    return (
      <motion.div
        className="relative flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <LottieHandler
          animationName="talking-mouth"
          loop
          className="h-64 w-300"
          style={{ filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))" }}
        />
      </motion.div>
    );
  }

  // Boca em repouso - usa animação Lottie suave
  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      transition={{
        repeat: Infinity,
        repeatType: "reverse",
        duration: 2,
        ease: "easeInOut",
      }}
    >
      <LottieHandler
        animationName="standy-mouth"
        loop
        className="h-64 w-lg"
        style={{ filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))" }}
      />
    </motion.div>
  );
}
