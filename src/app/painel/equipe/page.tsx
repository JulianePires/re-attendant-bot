import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { TeamList } from "@/components/dashboard/organisms/TeamList";
import { RestrictedArea } from "@/components/painel/RestrictedArea";
import { APP_ROUTES } from "@/lib/constants";
import { auth } from "@/lib/auth";

/**
 * Página de Gerenciamento de Equipe
 *
 * CORRIGIDO: Usa auth.api.getSession() do servidor com headers() correto
 * Comparação case-insensitive para role
 */
export default async function EquipePage() {
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
    return <RestrictedArea />;
  }

  return (
    <div className="w-full flex-1 space-y-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Gerenciamento da Equipe</h2>
        <p className="mt-1 text-zinc-400">
          Adicione, remova e altere permissões dos profissionais da clínica.
        </p>
      </div>

      <TeamList usuarioLogadoId={session.user.id} />
    </div>
  );
}
