"use client";

import { cn } from "@/lib/utils";

// ================================================================
// BotAvatar — Rosto animado do assistente virtual
//
// Integração com Lottie (quando o arquivo JSON estiver disponível):
//   1. Instale: bun add lottie-react
//   2. Copie o JSON para: src/assets/bot-face.json
//   3. Substitua o <div> placeholder pelo fragmento abaixo:
//
//   import Lottie from "lottie-react";
//   import botFace from "@/assets/bot-face.json";
//   <Lottie animationData={botFace} loop className={tamanhos[tamanho]} />
// ================================================================

type Tamanho = "sm" | "md" | "lg";

interface BotAvatarProps {
  tamanho?: Tamanho;
  className?: string;
}

const tamanhos: Record<Tamanho, string> = {
  sm: "h-28 w-28 text-6xl",
  md: "h-44 w-44 text-8xl",
  lg: "h-60 w-60 text-9xl",
};

export function BotAvatar({ tamanho = "lg", className }: BotAvatarProps) {
  return (
    <div
      data-testid="bot-avatar"
      role="img"
      aria-label="Assistente virtual da clínica"
      className={cn(
        // Círculo branco com sombra suave — moldura do avatar
        "flex items-center justify-center rounded-full",
        "bg-white/90 shadow-2xl ring-4 ring-white/60",
        // Pulso sutil indica que o totem está ativo e aguardando
        "animate-pulse",
        tamanhos[tamanho],
        className
      )}
    >
      {/* Placeholder visual — substituir pelo <Lottie> quando disponível */}
      <span aria-hidden="true" role="presentation">
        🤖
      </span>
    </div>
  );
}
