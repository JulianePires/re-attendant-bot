"use client";

import { LottieHandler } from "@/components/common/atoms/LottieHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function RestrictedArea() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md bg-transparent ring-0">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20 text-red-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-500">Acesso Restrito</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mx-auto h-64 w-64">
            <LottieHandler animationName="security-research" />
          </div>
          <p className="mt-4 text-lg text-zinc-400">
            Desculpe, esta área é exclusiva para administradores.
          </p>
          <p className="text-sm text-zinc-500">
            Se você acredita que isso é um erro, entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
