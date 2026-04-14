"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";
import { atualizarUsuarioAdmin } from "@/server/actions/usuarios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const editUserSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  role: z.enum(["admin", "profissional", "revoked"], {
    required_error: "Selecione uma permissão",
  }),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: {
    id: string;
    name: string;
    email: string | null;
    role: string | null;
  };
  isCurrentUser: boolean;
}

export function EditUserDialog({ user, isCurrentUser }: EditUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email || "",
      role: (user.role as "admin" | "profissional" | "revoked") || "profissional",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditUserFormValues) =>
      atualizarUsuarioAdmin({
        userId: user.id,
        data: {
          name: data.name,
          email: data.email || undefined,
          role: data.role,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["profissionais"] });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  const onSubmit = (data: EditUserFormValues) => {
    updateMutation.mutate(data);
  };

  const roleValue = watch("role");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
          disabled={isCurrentUser}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="z-[999] border-zinc-800 bg-zinc-900 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Editar Usuário</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Atualize os dados do colaborador abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
          <Field>
            <FieldLabel htmlFor="name">Nome Completo</FieldLabel>
            <Input
              id="name"
              {...register("name")}
              className="border-zinc-800 bg-zinc-950 text-zinc-100"
              disabled={updateMutation.isPending}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          {/* E-mail */}
          <Field>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className="border-zinc-800 bg-zinc-950 text-zinc-100"
              disabled={updateMutation.isPending}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>

          {/* Role */}
          <Field>
            <FieldLabel htmlFor="role">Permissão (Cargo)</FieldLabel>
            <Select
              value={roleValue}
              onValueChange={(value) =>
                setValue("role", value as "admin" | "profissional" | "revoked")
              }
              disabled={updateMutation.isPending || isCurrentUser}
            >
              <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1000] border-zinc-800 bg-zinc-900 text-zinc-100">
                <SelectItem value="profissional">Profissional / Equipe</SelectItem>
                <SelectItem value="admin" className="font-medium text-violet-400">
                  Administrador
                </SelectItem>
                <SelectItem value="revoked" className="font-medium text-red-400">
                  Acesso Revogado
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <FieldError>{errors.role.message}</FieldError>}
            {isCurrentUser && (
              <p className="text-xs text-amber-400">Você não pode alterar sua própria permissão</p>
            )}
          </Field>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={updateMutation.isPending}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-violet-600 text-white hover:bg-violet-500"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
