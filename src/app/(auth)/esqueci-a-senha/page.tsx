"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { forgetPasswordSchema } from "@/lib/validations/schemas";
import { type z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

type ForgetPasswordValues = z.infer<typeof forgetPasswordSchema>;

export default function ForgetPasswordPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgetPasswordValues>({
    resolver: zodResolver(forgetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgetPasswordValues) {
    setIsSubmitting(true);
    try {
      // BetterAuth envia um e-mail com o link de redefinição de senha
      // O link contém um token que será usado na página de reset
      const { error } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: "/redefinir-senha", // Redireciona após clique no e-mail
      });

      if (error) {
        toast.error("Erro ao enviar link de recuperação.", {
          description: error.message || "Verifique se o e-mail está registrado na plataforma.",
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("Link de recuperação enviado!", {
        description: "Verifique sua caixa de entrada e clique no link para redefinir sua senha.",
      });

      // Redireciona após sucesso
      setTimeout(() => {
        router.push("/adm/login");
      }, 2000);
    } catch (error) {
      console.error("[forgetPassword]", error);
      toast.error("Erro ao processar solicitação. Tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-950 p-4 text-zinc-100">
      <Card className="relative z-10 w-full max-w-7xl animate-in rounded-3xl border-zinc-800/60 bg-zinc-900/60 shadow-2xl backdrop-blur-xl duration-500 zoom-in-95 fade-in">
        <CardHeader className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 shadow-[0_0_20px_rgba(124,58,237,0.1)]">
            <Mail className="h-8 w-8 text-violet-400" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            Recuperar Acesso
          </CardTitle>
          <CardDescription className="mt-2 text-sm text-zinc-400">
            Digite seu e-mail para receber um link de redefinição de senha
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
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                  {...register("email")}
                />
              </InputGroup>
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full rounded-xl bg-violet-600 py-6 text-base font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:bg-violet-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Link"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="w-full text-zinc-400 hover:text-zinc-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
