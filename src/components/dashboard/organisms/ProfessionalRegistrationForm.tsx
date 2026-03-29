"use client";

import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, FileText, Lock, Mail, UserCircle } from "lucide-react";
import { APP_ROUTES } from "@/lib/constants";

// Aqui vamos formatar o CPF visualmente mas enviar limpo
const formatCPF = (val: string) => {
  // ... (lógica de formatação existente)
  return val
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const formSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("E-mail corporativo inválido"),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, "CPF inválido"),
  password: z.string().min(6, "A senha precisa de pelo menos 6 caracteres"),
  role: z.enum(["user", "admin"], { required_error: "Selecione o cargo" }),
});

export function ProfessionalRegistrationForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      cpf: "",
      password: "",
      role: "user",
    },
  });

  const selectedRole = watch("role");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      const { error } = await authClient.admin.createUser({
        email: values.email,
        name: values.name,
        password: values.password,
        role: values.role,
        data: {
          cpf: values.cpf.replace(/\D/g, ""),
        },
      });

      if (error) {
        throw new Error(
          error.message || "Falha ao criar usuário. Verifique se o e-mail já existe."
        );
      }

      toast.success(`Conta para ${values.name} criada com sucesso!`);
      reset();
      router.push(APP_ROUTES.EQUIPE);
    } catch (error: unknown) {
      console.error(error);
      const mensagem =
        error instanceof Error
          ? error.message
          : "Erro no cadastro. Verifique os dados e permissões.";
      toast.error(mensagem);
    } finally {
      setIsLoading(false);
    }
  }

  // Extrai o onChange do registro do CPF para aplicar a máscara
  const { onChange: onCpfChange, ...cpfRegister } = register("cpf");

  return (
    <Card className="max-w-2xl border-zinc-800/80 bg-zinc-950/40 shadow-2xl backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 text-2xl font-bold">
          <UserPlus className="h-6 w-6 text-violet-500" />
          Registrar Membro da Equipe
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Adicione um novo profissional de saúde ou administrador ao sistema.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Nome Completo</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <UserCircle className="size-4 text-zinc-500 dark:text-zinc-300" />
                </InputGroupAddon>
                <InputGroupInput id="name" placeholder="Dr. João Silva" {...register("name")} />
              </InputGroup>
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="email">E-mail Corporativo</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Mail className="size-4 text-zinc-500 dark:text-zinc-300" />
                </InputGroupAddon>
                <InputGroupInput
                  id="email"
                  placeholder="joao@clinica.com"
                  type="email"
                  {...register("email")}
                />
              </InputGroup>
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="cpf">CPF</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <FileText className="size-4 text-zinc-500 dark:text-zinc-300" />
                </InputGroupAddon>
                <InputGroupInput
                  id="cpf"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="font-mono"
                  {...cpfRegister}
                  onChange={(e) => {
                    e.target.value = formatCPF(e.target.value);
                    onCpfChange(e);
                  }}
                />
              </InputGroup>
              {errors.cpf && <FieldError>{errors.cpf.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Senha Provisória</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Lock className="size-4 text-zinc-500 dark:text-zinc-300" />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                />
              </InputGroup>
              {errors.password && <FieldError>{errors.password.message}</FieldError>}
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Nível de Acesso (Cargo)</FieldLabel>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-300" />
                <Select
                  onValueChange={(value) =>
                    setValue("role", value as "user" | "admin", { shouldValidate: true })
                  }
                  value={selectedRole}
                >
                  <SelectTrigger className="border-zinc-800 bg-zinc-900 pl-10">
                    <SelectValue placeholder="Selecione o cargo do colaborador" />
                  </SelectTrigger>
                  <SelectContent className="cursor-pointer border-zinc-800 bg-zinc-900 dark:text-zinc-300">
                    <SelectItem value="user">
                      Profissional de Saude (Recepcao/Atendimento)
                    </SelectItem>
                    <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.role && <FieldError>{errors.role.message}</FieldError>}
            </Field>
          </div>

          <div className="mt-6 flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-50 bg-violet-600 text-white hover:bg-violet-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cadastrando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Finalizar Cadastro
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
