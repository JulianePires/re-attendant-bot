"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import doctorAnimation from "../../../public/lottie/doctor.json";

const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.default), {
  ssr: false,
});

interface DoctorLoaderProps {
  message?: string;
  className?: string;
}

export function DoctorLoader({ message = "Carregando...", className }: DoctorLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-6 text-center", className)}>
      <div className="relative mb-4 flex h-32 w-32 items-center justify-center">
        <Lottie
          animationData={doctorAnimation}
          loop
          className="h-full w-full drop-shadow-xl"
          aria-hidden="true"
        />
      </div>
      {message && <h3 className="animate-pulse text-xl font-medium text-zinc-200">{message}</h3>}
    </div>
  );
}
