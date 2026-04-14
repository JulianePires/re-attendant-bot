"use client";

import { useState } from "react";
import { LottieBot } from "@/components/tablet/LottieBot";
import { KioskInteractionFlow } from "@/components/tablet/KioskInteractionFlow";

export default function TabletPage() {
  const [isTalking, setIsTalking] = useState(false);

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 select-none">
      {/* Robot face frame */}
      <div className="relative flex flex-col items-center">
        {/* Head shell */}
        <div className="relative flex flex-col items-center rounded-[4rem] border-2 border-violet-700/50 bg-linear-to-b from-zinc-700 to-zinc-900 px-16 pt-12 pb-10 shadow-[0_0_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]">
          {/* Ear accents */}
          <div className="absolute top-1/3 -left-4 h-16 w-3 rounded-l-full bg-violet-700/60" />
          <div className="absolute top-1/3 -right-4 h-16 w-3 rounded-r-full bg-violet-700/60" />

          {/* Antenna */}
          <div className="-tranviolet-x-1/2 absolute -top-7 left-1/2 flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
            <div className="h-7 w-1 rounded-full bg-violet-600" />
          </div>

          <LottieBot isTalking={isTalking} className="h-[42vh] w-[42vh]" />
        </div>

        {/* Chin / neck connector */}
        <div className="h-4 w-24 rounded-b-2xl bg-violet-800 shadow-inner" />
      </div>

      {/* Interaction flow — overlays at bottom */}
      <main className="absolute inset-0 z-10 flex h-full w-full flex-col">
        <KioskInteractionFlow handleToggleTalking={setIsTalking} />
      </main>
    </div>
  );
}
