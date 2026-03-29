"use client";

import Lottie, { LottieComponentProps } from "lottie-react";
import { ComponentProps, useEffect, useState } from "react";

// Definindo os nomes das animações disponíveis para segurança de tipo
type AnimationName =
  | "connection-error"
  | "security-research"
  | "search-for-interface"
  | "loader"
  | "bot-greeting"
  | "doctor-loading";

// Mapeamento dos nomes para os caminhos dos arquivos JSON na pasta `public`
const animationMap: Record<AnimationName, string> = {
  "connection-error": "/lottie/connection-error.json",
  "security-research": "/lottie/security-research.json",
  "search-for-interface": "/lottie/search-for-interface.json",
  loader: "/lottie/loader.json",
  "bot-greeting": "/lottie/ai-bot.json", // Corrigido para o nome do arquivo correto
  "doctor-loading": "/lottie/doctor.json", // Corrigido para o nome do arquivo correto
};

interface LottieHandlerProps extends Omit<LottieComponentProps, "animationData"> {
  animationName: AnimationName;
  containerProps?: ComponentProps<"div">;
}

/**
 * Componente padronizado para renderizar animações Lottie.
 * Carrega os arquivos JSON de forma assíncrona (lazy loading) para otimizar o carregamento inicial.
 */
export function LottieHandler({ animationName, containerProps, ...props }: LottieHandlerProps) {
  const [animationData, setAnimationData] = useState<LottieComponentProps["animationData"] | null>(
    null
  );

  useEffect(() => {
    const fetchAnimation = async () => {
      const path = animationMap[animationName];
      try {
        const response = await fetch(path);
        const data = await response.json();
        setAnimationData(data);
      } catch (error) {
        console.error(`Failed to load Lottie animation: ${animationName}`, error);
      }
    };

    fetchAnimation();
  }, [animationName]);

  if (!animationData) {
    // Você pode renderizar um placeholder de carregamento aqui se desejar
    return <div {...containerProps} />;
  }

  return (
    <div {...containerProps}>
      <Lottie animationData={animationData} {...props} />
    </div>
  );
}
