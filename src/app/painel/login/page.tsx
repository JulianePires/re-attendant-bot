"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2, Lock, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { APP_ROUTES } from "@/lib/constants";

const loginSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error("Credenciais inválidas. Verifique seu e-mail e senha.");
        setIsLoading(false);
        return;
      }

      toast.success("Login realizado com sucesso!");
      router.push(APP_ROUTES.DASHBOARD);
    } catch {
      toast.error("Ocorreu um erro ao tentar fazer login. Tente novamente.");
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-950 p-4 text-zinc-100">
      {/* Decorações visuais ao fundo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-violet-900/10 via-zinc-950 to-zinc-950"></div>
      <div className="pointer-events-none absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-violet-600/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute -right-[10%] -bottom-[20%] h-[50%] w-[50%] rounded-full bg-indigo-600/10 blur-[120px]"></div>

      <Card className="relative z-10 w-full max-w-md animate-in rounded-3xl border-zinc-800/60 bg-zinc-900/60 shadow-2xl backdrop-blur-xl duration-500 zoom-in-95 fade-in">
        <CardHeader className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 shadow-[0_0_20px_rgba(124,58,237,0.1)]">
            <Lock className="h-8 w-8 text-violet-400" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            Acesso Restrito
          </CardTitle>
          <CardDescription className="mt-2 text-sm text-zinc-400">
            Insira suas credenciais corporativas
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Field>
              <FieldLabel htmlFor="email">E-mail Corporativo</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <Mail className="size-5 text-zinc-500" />
                </InputGroupAddon>
                <InputGroupInput
                  id="email"
                  type="email"
                  placeholder="nome@clinica.com"
                  {...register("email")}
                />
              </InputGroup>
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <a
                  href="/esqueci-a-senha"
                  className="text-xs text-violet-400 transition-colors hover:text-violet-300"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <Lock className="size-5 text-zinc-500" />
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

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full rounded-xl bg-violet-600 py-6 text-base font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:bg-violet-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Autenticando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
