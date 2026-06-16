"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/painel/BottomNav";
import { PainelHeader } from "@/components/painel/PainelHeader";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pathname = usePathname();
  const isLoginRoute = pathname === "/adm/login";
  const mainClassName = isLoginRoute
    ? "flex min-h-screen items-center justify-center p-4"
    : isFullscreen
      ? "h-full overflow-y-auto p-6"
      : "min-h-full px-6 pt-6 pb-24";
  const containerClassName = isLoginRoute ? "w-full" : "mx-auto max-w-screen-2xl";

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
      {!isLoginRoute && (
        <PainelHeader onFullscreenToggle={setIsFullscreen} isFullscreen={isFullscreen} />
      )}

      {/* Main Content */}
      <main className={mainClassName}>
        <div className={containerClassName}>{children}</div>
      </main>

      {/* Bottom Navigation (hidden in fullscreen) */}
      <AnimatePresence>{!isFullscreen && !isLoginRoute && <BottomNav />}</AnimatePresence>
    </div>
  );
}
