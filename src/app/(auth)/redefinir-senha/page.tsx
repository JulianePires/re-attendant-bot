"use client";

import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2, Lock, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { resetPasswordSchema } from "@/lib/validations/schemas";
import { type z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-zinc-950" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = searchParams.get("token");
  const isValidToken = Boolean(token);

  // Exibe feedback quando o token não existe
  useEffect(() => {
    if (!token) {
      toast.error("Token de recuperação inválido.", {
        description: "O link expirou ou é inválido.",
      });
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setIsSubmitting(true);

    if (!token) {
      toast.error("Token não encontrado. Link pode estar expirado.");
      setIsSubmitting(false);
      return;
    }

    try {
      // BetterAuth reseta a senha usando o token fornecido
      const { error } = await authClient.resetPassword({
        token,
        newPassword: values.password,
      });

      if (error) {
        toast.error("Erro ao redefinir senha.", {
          description: error.message || "O link expirou. Solicite um novo link.",
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("Senha redefinida com sucesso!", {
        description: "Você pode fazer login com sua nova senha.",
      });

      // Redireciona para o login após sucesso
      setTimeout(() => {
        router.push("/painel/login");
      }, 2000);
    } catch (error) {
      console.error("[resetPassword]", error);
      toast.error("Erro ao processar solicitação. Tente novamente.");
      setIsSubmitting(false);
    }
  }

  if (!isValidToken) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-950 p-4 text-zinc-100">
        <Card className="relative z-10 w-full max-w-7xl rounded-3xl border-red-800/60 bg-zinc-900/60 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pt-8 pb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Link Inválido</CardTitle>
            <CardDescription className="mt-2 text-zinc-400">
              O link expirou ou é inválido.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <Button
              onClick={() => router.push("/esqueci-a-senha")}
              className="w-full rounded-xl bg-violet-600 py-6 text-base font-semibold text-white hover:bg-violet-500"
            >
              Solicitar Novo Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-950 p-4 text-zinc-100">
      <Card className="relative z-10 w-full max-w-7xl animate-in rounded-3xl border-zinc-800/60 bg-zinc-900/60 shadow-2xl backdrop-blur-xl duration-500 zoom-in-95 fade-in">
        <CardHeader className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 shadow-[0_0_20px_rgba(124,58,237,0.1)]">
            <Lock className="h-8 w-8 text-violet-400" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            Redefinir Senha
          </CardTitle>
          <CardDescription className="mt-2 text-sm text-zinc-400">
            Digite uma nova senha para sua conta
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Field>
              <FieldLabel htmlFor="password">Nova Senha</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <Lock className="size-5 text-zinc-500" />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  {...register("password")}
                />
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-500 transition-colors hover:text-zinc-300"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </InputGroupAddon>
              </InputGroup>
              {errors.password && <FieldError>{errors.password.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirmar Senha</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <Lock className="size-5 text-zinc-500" />
                </InputGroupAddon>
                <InputGroupInput
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  {...register("confirmPassword")}
                />
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-zinc-500 transition-colors hover:text-zinc-300"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </InputGroupAddon>
              </InputGroup>
              {errors.confirmPassword && <FieldError>{errors.confirmPassword.message}</FieldError>}
            </Field>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-8 w-full rounded-xl bg-violet-600 py-6 text-base font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:bg-violet-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Redefinir Senha
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/painel/login")}
              className="w-full text-zinc-400 hover:text-zinc-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
