/**
 * Serviço de Email
 *
 * Gerencia o envio de emails através do SMTP configurado.
 * Fornece uma interface simples e type-safe para enviar diferentes tipos de email.
 *
 * Características:
 * - Retry automático em caso de falha
 * - Logging detalhado para debugging
 * - Validação de configuração
 * - Type-safe com TypeScript
 */

import nodemailer, { type Transporter } from "nodemailer";
import { emailConfig, isEmailConfigured, warnIfEmailNotConfigured } from "./config";
import { PasswordResetEmailTemplate, PasswordChangedEmailTemplate } from "./templates";

// Singleton de transporter para reutilizar conexão
let transporterInstance: Transporter | null = null;

/**
 * Obtém ou cria uma instância do transporter SMTP
 * @returns Transporter nodemailer configurado
 * @throws Error se as variáveis de ambiente não estão configuradas
 */
function getTransporter(): Transporter {
  if (transporterInstance) {
    return transporterInstance;
  }

  if (!isEmailConfigured()) {
    warnIfEmailNotConfigured();
    throw new Error(
      "Email não configurado. Verifique as variáveis de ambiente: EMAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS"
    );
  }

  transporterInstance = nodemailer.createTransport({
    host: emailConfig.smtp.host,
    port: emailConfig.smtp.port,
    secure: emailConfig.smtp.secure,
    auth: {
      user: emailConfig.smtp.auth.user,
      pass: emailConfig.smtp.auth.pass,
    },
  });

  return transporterInstance;
}

/**
 * Opções de envio de email
 */
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Envia um email através do SMTP configurado
 *
 * @param options - Configurações do email (to, subject, html)
 * @param retryCount - Número de tentativas (padrão: 0 - será incrementado automaticamente)
 * @returns Promise<string> - ID da mensagem enviada
 * @throws Error se falhar após todas as tentativas
 */
export async function sendEmail(
  options: SendEmailOptions,
  retryCount: number = 0
): Promise<string> {
  const { to, subject, html, from = emailConfig.from, replyTo } = options;

  try {
    const transporter = getTransporter();

    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo,
      priority: "normal",
    });

    console.log(`✅ Email enviado com sucesso para ${to}`, {
      messageId: result.messageId,
      subject,
    });

    return result.messageId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`❌ Erro ao enviar email para ${to} (tentativa ${retryCount + 1})`, {
      error: errorMessage,
      subject,
    });

    // Retry automático
    if (retryCount < emailConfig.validation.maxRetries) {
      console.log(`🔄 Tentando novamente... (${retryCount + 1}/${emailConfig.validation.maxRetries})`);
      // Aguarda 2 segundos antes de tentar novamente
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return sendEmail(options, retryCount + 1);
    }

    throw new Error(
      `Falha ao enviar email para ${to} após ${emailConfig.validation.maxRetries} tentativas: ${errorMessage}`
    );
  }
}

/**
 * Envia email de redefinição de senha
 *
 * @param email - Email do destinatário
 * @param resetLink - Link completo para redefinição de senha
 * @param name - Nome do usuário (opcional)
 * @returns Promise<string> - ID da mensagem enviada
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  name?: string
): Promise<string> {
  const html = PasswordResetEmailTemplate({
    resetLink,
    recipientName: name || "Profissional",
    expiryHours: Math.ceil(emailConfig.validation.resetTokenExpiryMinutes / 60),
  });

  return sendEmail({
    to: email,
    subject: "🔐 Redefinir sua senha - Clínica Reabi",
    html,
  });
}

/**
 * Envia email de confirmação de alteração de senha
 *
 * @param email - Email do destinatário
 * @param name - Nome do usuário (opcional)
 * @returns Promise<string> - ID da mensagem enviada
 */
export async function sendPasswordChangedEmail(email: string, name?: string): Promise<string> {
  const html = PasswordChangedEmailTemplate(name || "Profissional");

  return sendEmail({
    to: email,
    subject: "✅ Sua senha foi alterada - Clínica Reabi",
    html,
  });
}

/**
 * Verifica se a configuração de email está válida tentando conectar
 *
 * @returns Promise<boolean> - true se a conexão foi bem-sucedida
 */
export async function verifyEmailConfiguration(): Promise<boolean> {
  try {
    if (!isEmailConfigured()) {
      console.warn("⚠️ Email não configurado");
      return false;
    }

    const transporter = getTransporter();
    await transporter.verify();
    console.log("✅ Configuração de email verificada com sucesso");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro ao verificar configuração de email:", errorMessage);
    return false;
  }
}
