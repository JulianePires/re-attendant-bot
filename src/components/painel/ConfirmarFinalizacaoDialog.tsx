"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmarFinalizacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomePaciente: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmarFinalizacaoDialog({
  open,
  onOpenChange,
  nomePaciente,
  onConfirm,
  isLoading = false,
}: ConfirmarFinalizacaoDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-slate-800 bg-slate-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-100">Concluir Atendimento</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Tem certeza que deseja concluir o atendimento de{" "}
            <span className="font-semibold text-violet-400">{nomePaciente}</span>?
            <br />
            Esta ação removerá o paciente da fila ativa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            {isLoading ? "Concluindo..." : "Sim, Concluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
