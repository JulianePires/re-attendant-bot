import { Suspense } from "react";
import HistoryTable from "@/components/dashboard/organisms/HistoryTable";

export default function HistoricoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">Histórico de Consultas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Visualize os atendimentos finalizados e filtre por data.
        </p>
      </div>

      <Suspense fallback={<p className="text-muted-foreground text-sm">Carregando historico...</p>}>
        <HistoryTable />
      </Suspense>
    </div>
  );
}
