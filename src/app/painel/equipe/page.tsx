import { redirect } from "next/navigation";
import { TeamList } from "@/components/dashboard/organisms/TeamList";
import { RestrictedArea } from "@/components/painel/RestrictedArea";
import { APP_ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/auth-client";

export default async function EquipePage() {
  const session = await getSession();

  if (!session) {
    redirect(APP_ROUTES.LOGIN);
  }

  // Dupla checagem de segurança no nível da página.
  // O layout já faz uma verificação, mas isso garante a proteção caso o layout mude.
  if (session.data?.user.role !== "admin") {
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

      <TeamList usuarioLogadoId={session.data?.user.id} />
    </div>
  );
}
