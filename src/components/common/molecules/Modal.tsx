import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  trigger?: ReactNode;
  children: ReactNode;
  title: string;
  actionLabel: string;
  action: () => void;
  /** ID para aria-labelledby e acessibilidade */
  id?: string;
}

/**
 * Componente Modal com suporte a acessibilidade via ARIA
 * Implementa AlertDialog com boas práticas de keyboard navigation
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  trigger,
  children,
  actionLabel,
  action,
  id = "modal-dialog",
}) => {
  return (
    <AlertDialog>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      {isOpen && (
        <AlertDialogContent
          className="border-zinc-800 bg-zinc-950"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle id={`${id}-title`} className="text-white">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription id={`${id}-description`} className="text-zinc-400">
              {children}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white"
              aria-label="Cancelar ação"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={action}
              className="bg-red-600 text-white hover:bg-red-500"
              aria-label={actionLabel}
            >
              {actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
};
