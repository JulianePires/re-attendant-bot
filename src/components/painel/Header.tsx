import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "@/components/common/atoms/ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { obterTurnoAtual } from "@/lib/utils/turnos";

// Header é um Server Component: busca a sessão no servidor sem
// expor o token ao cliente. O botão de logout é Client Component
// separado (SignOutButton) pois precisa chamar signOut() do authClient.
export async function Header() {
  const sessao = await auth.api.getSession({
    headers: await headers(),
  });

  const nome = sessao?.user?.name ?? "Profissional";
  const agora = new Date();
  const turno = obterTurnoAtual(agora);
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="border-border bg-background/80 flex h-16 shrink-0 items-center justify-between border-b px-6 backdrop-blur">
      <div className="flex flex-col">
        <p className="text-muted-foreground text-sm">
          Olá, <span className="text-foreground font-semibold">{nome}</span>
        </p>
        <p className="text-muted-foreground text-xs capitalize">
          {dataFormatada} · {turno.emoji} Turno da {turno.label}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {sessao?.user && <NotificationBell />}

        <div className="bg-border mx-2 h-5 w-px" aria-hidden="true" />

        <SignOutButton />
      </div>
    </header>
  );
}
