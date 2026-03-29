"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/lib/constants";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    // Redireciona para a tela de login após logout
    router.push(APP_ROUTES.LOGIN);
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-muted-foreground hover:bg-primary/15 hover:text-primary flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out"
      aria-label="Sair da conta"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Sair
    </button>
  );
}
