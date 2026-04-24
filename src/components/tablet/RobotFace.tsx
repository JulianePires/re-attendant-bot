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
      {/* Anel externo — encaixe na face */}
      <div
        className="relative rounded-full p-[5px]"
        style={{
          background: "linear-gradient(145deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 100%)",
          boxShadow:
            "0 12px_40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255, 255, 255, 0.5)",
        }}
      >
        {/* Esclera (parte branca) */}
        <div
          className="relative h-48 w-48 overflow-hidden rounded-full bg-white"
          style={{
            boxShadow:
              "inset 0 6px 18px rgba(0,0,0,0.12), inset 0 -4px 10px rgba(0,0,0,0.06), inset 4px 0 10px rgba(0,0,0,0.04)",
          }}
        >
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
              <div
                className="relative h-32 w-32 rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 35%, #60a5fa, #1d4ed8)",
                  boxShadow:
                    "0 4px 16px rgba(29,78,216,0.5), inset 0 2px 4px rgba(255,255,255,0.3)",
                }}
              >
                {/* Pupila */}
                <div
                  className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900"
                  style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}
                />
                {/* Reflexo principal */}
                <div
                  className="absolute top-5 left-7 h-7 w-7 rounded-full bg-white/70"
                  style={{ filter: "blur(1px)" }}
                />
                {/* Reflexo secundário pequeno */}
                <div className="absolute top-9 left-14 h-3 w-3 rounded-full bg-white/40" />
              </div>
            </div>
          </motion.div>
        </div>
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
        <Image
          loading="eager"
          src="/images/left-eyebrow.png"
          alt="Sobrancelha Esquerda"
          width={500}
          height={40}
        />
      ) : (
        <Image
          loading="eager"
          src="/images/right-eyebrow.png"
          alt="Sobrancelha Direita"
          width={500}
          height={40}
        />
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
        className="h-84 w-lg"
        style={{ filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))" }}
      />
    </motion.div>
  );
}
