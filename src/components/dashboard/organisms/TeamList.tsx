"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listarProfissionais, alterarPermissaoProfissional } from "@/server/actions/usuarios";
import { Loader2, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Profissional = {
  id: string;
  name: string;
  email: string | null;
  cpf: string | null;
  role: string | null;
};

export const TeamList = ({ usuarioLogadoId }: { usuarioLogadoId: string }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const {
    data: profissionais,
    isLoading,
    isError,
  } = useQuery<Profissional[]>({
    queryKey: ["profissionais"],
    queryFn: listarProfissionais,
  });

  const alterarPermissaoMutation = useMutation({
    mutationFn: alterarPermissaoProfissional,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["profissionais"] });
      const previousData = queryClient.getQueryData<Profissional[]>(["profissionais"]);

      queryClient.setQueryData<Profissional[]>(["profissionais"], (old = []) =>
        old.map((profissional) =>
          profissional.id === variables.usuarioId
            ? { ...profissional, role: variables.role }
            : profissional
        )
      );

      return { previousData };
    },
    onSuccess: () => {
      toast.success("Permissão alterada com sucesso!");
    },
    onError: (err, _variables, context) => {
      queryClient.setQueryData(["profissionais"], context?.previousData);
      toast.error(err.message || "Erro ao alterar permissão do colaborador.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profissionais"] });
    },
  });

  const pessoasFiltradas =
    profissionais?.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <Card className="mt-6 overflow-hidden border-zinc-800/80 bg-zinc-950/40 shadow-2xl backdrop-blur-md">
      <CardHeader className="flex flex-col gap-4 border-b border-zinc-800/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-zinc-100">
            <ShieldAlert className="h-5 w-5 text-violet-500" /> Auditoria e Acessos
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Gerencie os níveis de permissão dos colaboradores.
          </CardDescription>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute top-3 left-3 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-zinc-800 bg-zinc-900 pl-9 text-zinc-200 focus-visible:ring-violet-500"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 text-zinc-100">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : isError ? (
          <div className="flex h-48 items-center justify-center text-red-500">
            Erro ao carregar os dados da equipe.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="py-4 font-semibold text-zinc-400">Nome</TableHead>
                <TableHead className="py-4 font-semibold text-zinc-400">E-mail</TableHead>
                <TableHead className="py-4 font-semibold text-zinc-400">CPF</TableHead>
                <TableHead className="w-62.5 py-4 font-semibold text-zinc-400">
                  Permissão (Cargo)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pessoasFiltradas.length > 0 ? (
                pessoasFiltradas.map((profissional) => (
                  <TableRow
                    key={profissional.id}
                    className="border-zinc-800/60 transition-colors hover:bg-zinc-900/40"
                  >
                    <TableCell className="px-4 py-3 font-medium text-zinc-200">
                      {profissional.name}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-zinc-400">
                      {profissional.email || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-sm text-zinc-400">
                      {profissional.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") ||
                        "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Select
                        defaultValue={profissional.role || undefined}
                        onValueChange={(novoCargo: string) => {
                          alterarPermissaoMutation.mutate({
                            usuarioId: profissional.id,
                            role: novoCargo,
                            usuarioLogadoId,
                          });
                        }}
                        disabled={
                          profissional.id === usuarioLogadoId || alterarPermissaoMutation.isPending
                        }
                      >
                        <SelectTrigger className="h-9 w-full border-zinc-800 bg-zinc-900 text-sm data-[state=open]:border-violet-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
                          <SelectItem value="profissional">Profissional / Equipe</SelectItem>
                          <SelectItem value="admin" className="font-medium text-violet-400">
                            Administrador
                          </SelectItem>
                          <SelectItem
                            value="revoked"
                            className="font-medium text-red-400 hover:text-red-300!"
                          >
                            Acesso Revogado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 border-zinc-800 text-center text-zinc-500 hover:bg-transparent"
                  >
                    Nenhum colaborador encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamList;
