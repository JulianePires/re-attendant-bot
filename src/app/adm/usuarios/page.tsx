import { UsersList } from "@/components/dashboard/organisms";
import { CarregandoPlaceholder } from "@/components/dashboard/organisms/Placeholders";
import { getSession } from "@/lib/auth-client";
import { APP_ROUTES } from "@/lib/constants";
import Link from "next/link";
import { Suspense } from "react";

export default async function UsuariosPage() {
  const session = await getSession();

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
        <UsersList loggedInUserId={session?.data?.user.id || ""} />
      </Suspense>
    </div>
  );
}
