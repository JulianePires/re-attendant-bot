/**
 * Configuração de Email
 *
 * Este arquivo centraliza todas as configurações de envio de email do sistema.
 * Suporta diferentes provedores através de variáveis de ambiente.
 *
 * Variáveis de ambiente necessárias (defina no .env.local):
 * - EMAIL_FROM: Endereço de e-mail do remetente (ex: noreply@clinica.com)
 * - SMTP_HOST: Servidor SMTP
 * - SMTP_PORT: Porta SMTP (normalmente 587 ou 465)
 * - SMTP_USER: Usuário SMTP
 * - SMTP_PASS: Senha SMTP
 *
 * Para desenvolvimento local, você pode usar:
 * - Ethereal Email (fake SMTP para testes)
 * - Mailtrap (serviço de teste de email)
 * - Resend (API moderna para envio de email)
 */

export const emailConfig = {
  // Remetente padrão dos emails
  from: process.env.EMAIL_FROM || "noreply@clinicareabi.com.br",

  // URLs base para construir links (redefinição de senha, confirmação de email, etc.)
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Configuração SMTP para nodemailer
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true", // true para porta 465, false para 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },

  // Timeouts
  timeouts: {
    send: 30000, // 30 segundos para enviar email
  },

  // Validações
  validation: {
    // Tempo máximo de validade do link de redefinição (em minutos)
    resetTokenExpiryMinutes: 60,
    // Máximo de tentativas de envio antes de desistir
    maxRetries: 3,
  },
};

/**
 * Valida se as variáveis de ambiente necessárias estão configuradas
 * @returns boolean - true se tudo está configurado, false caso contrário
 */
export function isEmailConfigured(): boolean {
  const required = ["EMAIL_FROM", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  return required.every((key) => process.env[key]);
}

/**
 * Loga warning se email não está configurado (útil para desenvolvimento)
 */
export function warnIfEmailNotConfigured(): void {
  if (!isEmailConfigured()) {
    console.warn(
      "⚠️ Email não está configurado. Password reset e outras funcionalidades de email não funcionarão."
    );
    console.warn("Configure as seguintes variáveis de ambiente:");
    console.warn("  - EMAIL_FROM");
    console.warn("  - SMTP_HOST");
    console.warn("  - SMTP_PORT");
    console.warn("  - SMTP_USER");
    console.warn("  - SMTP_PASS");
  }
}
