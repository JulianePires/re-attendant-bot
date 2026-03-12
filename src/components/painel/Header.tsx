import { Bell } from "lucide-react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";

// Header é um Server Component: busca a sessão no servidor sem
// expor o token ao cliente. O botão de logout é Client Component
// separado (SignOutButton) pois precisa chamar signOut() do authClient.
export async function Header() {
  const sessao = await auth.api.getSession({
    headers: await headers(),
  });

  const nome = sessao?.user?.name ?? "Profissional";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <p className="text-sm text-slate-600">
        Bom dia, <span className="font-semibold text-slate-900">{nome}</span>
      </p>

      <div className="flex items-center gap-1">
        {/* Sininho — placeholder para notificações futuras */}
        <button
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="mx-2 h-5 w-px bg-slate-200" aria-hidden="true" />

        <SignOutButton />
      </div>
    </header>
  );
}
