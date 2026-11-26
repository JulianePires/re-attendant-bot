import { notFound } from "next/navigation";
import TotemCheckinPage from "@/components/tablet/checkin/TotemCheckinPage";
import { obterDispositivoAutorizado } from "@/lib/crm/acesso";
import { checkinCrmHabilitado } from "@/lib/crm/config";

// A flag e a autorização são lidas a cada requisição.
export const dynamic = "force-dynamic";

/**
 * Totem de teste do check-in integrado ao CRM (REQ-001). O /recepcao não muda.
 * Sem o tablet ativado, a rota responde como inexistente e não revela que existe (RNF-001.4).
 */
export default async function RecepcaoCrmPage() {
  if (!checkinCrmHabilitado()) notFound();
  if (!(await obterDispositivoAutorizado())) notFound();

  return <TotemCheckinPage />;
}
