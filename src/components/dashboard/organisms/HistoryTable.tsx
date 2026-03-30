"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DatePicker from "@/components/common/molecules/DatePicker";
import { obterHistoricoDoDia } from "@/server/actions/historico";
import { format } from "date-fns";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

type HistoricoItem = {
  id: string;
  criadoEm: Date | string;
  finalizadoEm: Date | string | null;
  paciente: {
    name: string;
    cpf: string | null;
  };
};

const HistoryTable = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data, isLoading, isError } = useQuery<HistoricoItem[]>({
    queryKey: ["historico", selectedDate],
    queryFn: () => obterHistoricoDoDia(selectedDate.toISOString()),
    select: (data) => data || [],
  });

  return (
    <Card className="border border-zinc-800/50 bg-zinc-950/60 shadow-xl backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          Histórico de Atendimentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-in space-y-4 duration-500 fade-in">
          <DatePicker value={selectedDate} onChange={setSelectedDate} />

          {isLoading && (
            <p className="flex h-24 items-center justify-center gap-2 text-sm text-violet-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </p>
          )}
          {isError && (
            <p className="flex h-24 items-center justify-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-5 w-5" /> Erro ao carregar histórico.
            </p>
          )}
          {data?.length === 0 && (
            <p className="text-muted-foreground flex h-24 items-center justify-center text-center text-sm">
              Nenhum atendimento finalizado nesta data.
            </p>
          )}

          {data && data.length > 0 && (
            <div className="rounded-md border border-zinc-800/50 bg-zinc-900/40">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800/50 hover:bg-transparent">
                    <TableHead className="font-semibold text-zinc-300">Paciente</TableHead>
                    <TableHead className="font-semibold text-zinc-300">CPF</TableHead>
                    <TableHead className="font-semibold text-zinc-300">Chegada</TableHead>
                    <TableHead className="font-semibold text-zinc-300">Atendimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index: number) => (
                    <TableRow
                      key={item.id}
                      className="animate-in border-zinc-800/50 transition-colors duration-300 fill-mode-both fade-in slide-in-from-bottom-2 hover:bg-zinc-800/40"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium text-zinc-400">
                        {item.paciente.name}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {item.paciente.cpf
                          ? item.paciente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {format(new Date(item.criadoEm), "HH:mm")}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {item.finalizadoEm ? format(new Date(item.finalizadoEm), "HH:mm") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryTable;
