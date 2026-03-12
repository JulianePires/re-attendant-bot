"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    // Redireciona para o totem após logout —
    // o profissional volta à tela pública do paciente
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
      aria-label="Sair da conta"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Sair
    </button>
  );
}
