"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, UserRound } from "lucide-react";
import { registrarEEntrarNaFila } from "@/server/actions/atendimento";
import { patientQueueSchema } from "@/lib/validations/schemas";
import type { Atendimento } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { z } from "zod";

type FormData = z.infer<typeof patientQueueSchema>;

export default function PatientQueueForm({
  tipoChamada,
  onSuccess,
}: {
  tipoChamada: "normal" | "urgente";
  onSuccess: (atendimento: Atendimento) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(patientQueueSchema),
    defaultValues: {
      nome: "",
    },
  });

  async function onSubmit(values: FormData) {
    try {
      const resultado = await registrarEEntrarNaFila({
        nome: values.nome || "Não informado",
        tipoChamada,
      });

      toast.success("Entrada na fila realizada com sucesso!");
      onSuccess(resultado);
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6 text-left">
      <Field>
        <FieldLabel htmlFor="nome" className="text-zinc-400">
          Nome Completo
        </FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <UserRound className="size-5 text-zinc-500" />
          </InputGroupAddon>
          <InputGroupInput
            id="nome"
            placeholder="João da Silva"
            className="h-14 border-zinc-700/50 bg-zinc-900 py-6 text-lg shadow-inner"
            {...register("nome")}
          />
        </InputGroup>
        {errors.nome && <FieldError>{errors.nome.message}</FieldError>}
      </Field>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-zinc-100 py-7 text-lg font-bold text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-white"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            Processando...
          </>
        ) : (
          "Gerar Senha"
        )}
      </Button>
    </form>
  );
}
