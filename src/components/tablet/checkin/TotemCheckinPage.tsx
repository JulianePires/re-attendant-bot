"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Maximize } from "lucide-react";
import { useWakeLock } from "react-screen-wake-lock";
import { RobotFaceContainer } from "@/components/tablet/RobotFaceContainer";
import { KioskCheckinFlow } from "./KioskCheckinFlow";

/**
 * Layout do totem de teste: o mesmo do /recepcao (rosto do robô, tela cheia,
 * tela acesa), com o fluxo de check-in integrado ao CRM (RNF-001.14).
 */
export default function TotemCheckinPage() {
  const [isTalking, setIsTalking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isSupported, released, request, release } = useWakeLock({
    onRequest: () => setIsFullscreen(true),
    onError: () => {},
    onRelease: () => setIsFullscreen(false),
    reacquireOnPageVisible: false,
  });

  function handleActivateFullscreen() {
    if (!isSupported) {
      setIsFullscreen(true);
      return;
    }
    if (released) request();
  }

  function handleDeactivateFullscreen() {
    if (!isSupported) {
      setIsFullscreen(false);
      return;
    }
    if (!released) release();
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) handleDeactivateFullscreen();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enableFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(handleActivateFullscreen);
    }
  };

  return (
    <main
      aria-label="Totem de check-in"
      className="relative h-screen w-screen overflow-hidden bg-linear-125 from-sky-500 via-sky-400 to-sky-600"
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <RobotFaceContainer isTalking={isTalking} />
      </motion.div>

      <KioskCheckinFlow handleToggleTalking={setIsTalking} />

      <div className="absolute top-6 right-6 flex items-center gap-2">
        {!isFullscreen && (
          <button
            type="button"
            onClick={enableFullscreen}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 transition-all hover:border-violet-500/50 hover:bg-slate-800 hover:text-violet-400 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:outline-none"
            aria-label="Tela cheia"
          >
            <Maximize className="h-5 w-5" />
          </button>
        )}
      </div>
    </main>
  );
}
