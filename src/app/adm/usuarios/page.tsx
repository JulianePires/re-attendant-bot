import { UsersList } from "@/components/dashboard/organisms";
import { CarregandoPlaceholder } from "@/components/dashboard/organisms/Placeholders";
import { auth } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/constants";
import { headers } from "next/headers";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { Suspense } from "react";

export default async function UsuariosPage() {
  // Obter sessão do servidor usando BetterAuth corretamente
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Se não há sessão, redireciona para login
  if (!session?.user) {
    redirect(APP_ROUTES.LOGIN);
  }

  // Normaliza role para comparação case-insensitive
  const userRole = (session.user.role || "").toLowerCase();

  // Verifica se o usuário tem permissão de admin
  if (userRole !== "admin") {
    forbidden();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">Usuarios</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie profissionais e permissões do painel.
          </p>
        </div>
        <Link
          href={APP_ROUTES.NOVO_USUARIO}
          className="rounded-md bg-violet-500 px-4 py-2 text-white hover:bg-violet-600"
        >
          Novo Usuário
        </Link>
      </div>

      <Suspense fallback={<CarregandoPlaceholder mensagem="Carregando usuários..." />}>
        <UsersList loggedInUserId={session?.user.id || ""} />
      </Suspense>
    </div>
  );
}
