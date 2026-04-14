"use client";

import { cn } from "@/lib/utils";
import { LottieHandler } from "@/components/common/atoms/LottieHandler";

interface LottieBotProps {
  className?: string;
  isTalking?: boolean;
}

export function LottieBot({ className, isTalking = false }: LottieBotProps) {
  return (
    <div
      role="img"
      aria-label="Assistente virtual da clínica"
      className={cn("flex flex-col items-center justify-between", className)}
    >
      <span className="flex items-baseline justify-between">
        <LottieHandler animationName="eyes" loop className="h-full w-60" aria-hidden="true" />
        <LottieHandler animationName="eyes" loop className="h-full w-60" aria-hidden="true" />
      </span>

      <LottieHandler
        animationName={isTalking ? "talking-mouth" : "standy-mouth"}
        loop
        className="h-3/4 w-auto"
        aria-hidden="true"
      />
    </div>
  );
}
