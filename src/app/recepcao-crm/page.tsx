import { notFound } from "next/navigation";
import TotemCheckinPage from "@/components/tablet/checkin/TotemCheckinPage";
import { checkinCrmHabilitado } from "@/lib/crm/config";

// A flag é lida a cada requisição: ligar ou desligar o totem de teste não exige novo build.
export const dynamic = "force-dynamic";

/** Totem de teste do check-in integrado ao CRM (REQ-001). O /recepcao não muda. */
export default function RecepcaoCrmPage() {
  if (!checkinCrmHabilitado()) notFound();

  return <TotemCheckinPage />;
}
