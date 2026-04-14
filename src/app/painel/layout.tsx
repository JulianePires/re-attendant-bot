"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/painel/BottomNav";
import { PainelHeader } from "@/components/painel/PainelHeader";
import { AnimatePresence } from "framer-motion";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div className="relative min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header (hidden in fullscreen) */}
      <PainelHeader onFullscreenToggle={setIsFullscreen} isFullscreen={isFullscreen} />

      {/* Main Content */}
      <main
        className={isFullscreen ? "h-screen overflow-y-auto p-6" : "min-h-screen px-6 pt-6 pb-24"}
      >
        <div className="mx-auto max-w-screen-2xl">{children}</div>
      </main>

      {/* Bottom Navigation (hidden in fullscreen) */}
      <AnimatePresence>{!isFullscreen && <BottomNav />}</AnimatePresence>
    </div>
  );
}
