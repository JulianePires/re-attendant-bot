import { ProfessionalRegistrationForm } from "@/components/dashboard/organisms/ProfessionalRegistrationForm";
import { RestrictedArea } from "@/components/painel/RestrictedArea";
import { auth } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";

export default async function NovoUsuarioPage() {
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
    <div className="w-full flex-1 space-y-6">
      <div>
        <Link
          href={APP_ROUTES.USUARIOS}
          className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-300"
        >
          <ArrowLeft className="mr-2" /> Voltar
        </Link>
        <h2 className="text-foreground text-3xl font-bold tracking-tight">Novo Profissional</h2>
        <p className="mt-1 text-zinc-400">
          Crie credenciais exclusivas para a equipe e defina suas permissões de acesso.
        </p>
      </div>

      <div className="pt-4">
        <ProfessionalRegistrationForm />
      </div>
    </div>
  );
}
