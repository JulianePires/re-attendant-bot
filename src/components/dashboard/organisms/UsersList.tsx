"use client";

import { Modal } from "@/components/common/molecules/Modal";
import { Button } from "@/components/ui/button";
import { obterUsuarios, removerUsuario } from "@/server/actions/usuarios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserCircle, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CarregandoPlaceholder, ErroPlaceholder } from "./Placeholders";

type UsuarioLista = {
  id: string;
  name: string;
  email?: string | null;
  role: string | null;
};

export default function UsersList({ loggedInUserId }: { loggedInUserId: string }) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery<UsuarioLista[]>({
    queryKey: ["usersList"],
    queryFn: async () => {
      return obterUsuarios();
    },
  });

  console.log("Usuários:", users);

  const removerMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return removerUsuario({ usuarioId: id, usuarioLogadoId: loggedInUserId });
    },
    onSuccess: () => {
      toast.success("Usuário removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["usersList"] });
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
    onError: (error: unknown) => {
      const mensagem =
        error instanceof Error ? error.message : "Não foi possível remover o usuário.";
      toast.error(mensagem);
    },
  });

  if (isLoading) {
    return <CarregandoPlaceholder mensagem="Carregando a lista de usuários" />;
  }

  if (isError) {
    return <ErroPlaceholder mensagem="Erro ao carregar usuários. Tente novamente mais tarde." />;
  }

  return (
    <div className="space-y-4">
      {users?.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between rounded-2xl border border-zinc-800/50 bg-zinc-950/60 p-4 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-violet-500/30"
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center justify-center rounded-full p-3 ${
                user.role === "paciente"
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border border-violet-500/20 bg-violet-500/10 text-violet-400"
              }`}
            >
              {user.role === "paciente" ? <UserCircle size={24} /> : <UserCog size={24} />}
            </div>
            <div>
              <p className="font-medium text-zinc-100">{user.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.role === "paciente"
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border border-violet-500/20 bg-violet-500/10 text-violet-400"
                  }`}
                >
                  {user.role === "paciente" ? "Paciente" : "Equipe Médica"}
                </span>
                {user.role !== "paciente" && (
                  <span className="text-sm text-zinc-500">{user.email}</span>
                )}
              </div>
            </div>
          </div>

          <Modal
            title="Confirmar Remoção"
            actionLabel="Remover"
            action={() => removerMutation.mutate({ id: user.id })}
            isOpen={isCancelModalOpen}
            trigger={
              <Button
                size="icon"
                variant="ghost"
                className="cursor-pointer text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => setIsCancelModalOpen(true)}
              >
                <Trash2 size={18} />
              </Button>
            }
          >
            <p>
              Tem certeza que deseja remover o usuário <strong>{user.name}</strong>? Esta ação não
              pode ser desfeita.
            </p>
          </Modal>
        </div>
      ))}
    </div>
  );
}
