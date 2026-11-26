import { notFound } from "next/navigation";
import AtivacaoTotemForm from "@/components/tablet/checkin/AtivacaoTotemForm";
import { checkinCrmHabilitado, obterChaveAcesso } from "@/lib/crm/config";

export const dynamic = "force-dynamic";

/** Ativação do tablet no totem de teste (RNF-001.4). Mostra só o campo da chave. */
export default function AtivarTotemPage() {
  if (!checkinCrmHabilitado() || !obterChaveAcesso()) notFound();

  return <AtivacaoTotemForm />;
}
