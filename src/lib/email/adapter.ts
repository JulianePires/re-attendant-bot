/**
 * Adaptador de Email para BetterAuth
 *
 * Implementa a interface de email customizado do BetterAuth,
 * permitindo usar o serviço de email personalizado com templates em português.
 *
 * O BetterAuth chama este adaptador para:
 * - Envio de link de redefinição de senha
 * - Confirmação de email (se habilitado)
 * - Outros eventos de autenticação
 */

import { sendPasswordResetEmail, sendPasswordChangedEmail } from "./service";

/**
 * Interface do adaptador de email para BetterAuth
 * Deve implementar os métodos de envio de email esperados pelo framework
 */
export const betterAuthEmailAdapter = {
  /**
   * Envia email de redefinição de senha
   * Chamado quando o usuário solicita recuperação de acesso
   *
   * @param email - Email do destinatário
   * @param data - Dados da solicitação
   * @param data.url - URL completa para redefinição (incluindo token)
   * @param data.token - Token de redefinição
   */
  sendPasswordResetEmail: async (
    email: string,
    data: {
      url: string;
      token: string;
    }
  ) => {
    try {
      await sendPasswordResetEmail(email, data.url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[BetterAuth] Erro ao enviar email de redefinição:", errorMessage);
      throw error;
    }
  },

  /**
   * Envia email de confirmação de email (se habilitado na configuração)
   * Chamado quando o usuário registra uma conta e precisa confirmar o email
   */
  sendVerificationEmail: async (
    email: string,
    data: {
      url: string;
      token: string;
    }
  ) => {
    console.log(`[BetterAuth] Email de verificação solicitado para ${email}`);
    // Implementar se necessário no futuro
  },

  /**
   * Envia email customizado
   * Útil para implementações futuras
   */
  sendCustomEmail: async (email: string, subject: string, html: string) => {
    console.log(`[BetterAuth] Email customizado para ${email}: ${subject}`);
    // Implementar se necessário no futuro
  },
};
