"use client";

import dynamic from "next/dynamic";
import { BotAvatar } from "@/components/tablet/BotAvatar";
import { cn } from "@/lib/utils";
import botAnimation from "../../../public/lottie/ai-bot.json";

const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.default), {
  ssr: false,
});

type Tamanho = "sm" | "md" | "lg";

interface LottieBotProps {
  animationData?: object;
  tamanho?: Tamanho;
  className?: string;
}

const tamanhos: Record<Tamanho, string> = {
  sm: "h-28 w-28",
  md: "h-44 w-44",
  lg: "h-60 w-60",
};

export function LottieBot({
  animationData = botAnimation,
  tamanho = "lg",
  className,
}: LottieBotProps) {
  if (!animationData) {
    return <BotAvatar tamanho={tamanho} className={className} />;
  }

  return (
    <div
      role="img"
      aria-label="Assistente virtual da clínica"
      className={cn("flex items-center justify-center", tamanhos[tamanho], className)}
    >
      <Lottie animationData={animationData} loop className="h-full w-full" aria-hidden="true" />
    </div>
  );
}
