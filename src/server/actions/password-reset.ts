/**
 * Ações de Servidor - Password Reset
 *
 * Server Actions para gerenciar fluxo de redefinição de senha.
 * Essas ações devem ser chamadas apenas do lado cliente em componentes "use client".
 */

"use server";

import { sendPasswordResetEmail } from "@/lib/email/service";
import { emailConfig } from "@/lib/email/config";
import { prisma } from "@/lib/prisma";

/**
 * Gera um token de redefinição de senha e envia email
 *
 * Esta função é tipicamente chamada pelo BetterAuth via seu middleware,
 * mas também pode ser usada manualmente se necessário.
 *
 * @param email - Email do usuário
 * @param resetToken - Token gerado pelo BetterAuth
 * @param redirectUrl - URL para redefinição de senha (com token)
 * @throws Error se usuário não encontrado ou email falhar
 */
export async function sendResetPasswordEmail(
  email: string,
  resetToken: string,
  redirectUrl: string
): Promise<void> {
  try {
    // Validar email
    if (!email || !email.includes("@")) {
      throw new Error("Email inválido");
    }

    // Verificar se usuário existe no banco
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Por segurança, não revela se o email existe ou não
      // Apenas registra e retorna sucesso
      console.warn(`[Password Reset] Tentativa de reset para email não registrado: ${email}`);
      return;
    }

    // Construir URL completa do link de reset
    const fullResetUrl = new URL(redirectUrl, emailConfig.baseUrl).toString();

    // Enviar email com o template customizado
    await sendPasswordResetEmail(email, fullResetUrl, user.name);

    // Log para auditoria
    console.log(`[Password Reset] Email enviado para ${email}`, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Password Reset Error]", errorMessage);

    // Não expor detalhes do erro ao cliente por segurança
    throw new Error("Erro ao processar solicitação de redefinição de senha");
  }
}

/**
 * Registra alteração de senha para fins de auditoria
 *
 * Chamado após a redefinição bem-sucedida de senha.
 *
 * @param userId - ID do usuário
 * @param timestamp - Timestamp da alteração
 */
export async function logPasswordChange(
  userId: string,
  timestamp: Date = new Date()
): Promise<void> {
  try {
    // Atualizar timestamp do último acesso
    await prisma.user.update({
      where: { id: userId },
      data: { ultimoAcesso: timestamp },
    });

    console.log(`[Password Changed] Senha alterada para usuário ${userId}`, {
      timestamp: timestamp.toISOString(),
    });
  } catch (error) {
    console.error("[Password Change Log Error]", error);
  }
}

/**
 * Valida se um token de reset ainda é válido
 *
 * @param token - Token a validar
 * @returns boolean - true se o token é válido
 */
export async function isResetTokenValid(token: string): Promise<boolean> {
  try {
    if (!token) {
      return false;
    }

    // Verificar se existe uma entrada de verificação com este token
    const verification = await prisma.verification.findUnique({
      where: { id: token },
    });

    if (!verification) {
      return false;
    }

    // Verificar se não expirou
    if (new Date() > verification.expiresAt) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Token Validation Error]", error);
    return false;
  }
}
