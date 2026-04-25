import { ProfessionalRegistrationForm } from "@/components/dashboard/organisms/ProfessionalRegistrationForm";
import { APP_ROUTES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovoUsuarioPage() {
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
