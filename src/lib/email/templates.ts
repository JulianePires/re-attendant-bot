/**
 * Templates de Email
 *
 * Componentes React que geram HTML para emails. Cada template segue o padrão:
 * - Responsivo e otimizado para clientes de email
 * - Cores do projeto (roxo #7c3aed, tema escuro)
 * - Acessível (contraste adequado, hierarquia clara)
 * - Em português (PT-BR)
 */

interface PasswordResetEmailProps {
  resetLink: string;
  recipientName?: string;
  expiryHours?: number;
}

/**
 * Template de Email para Redefinição de Senha
 *
 * Enviado quando o usuário solicita recuperação de acesso.
 * Contém um link único e com validade limitada para redefinição de senha.
 */
export function PasswordResetEmailTemplate({
  resetLink,
  recipientName = "Profissional",
  expiryHours = 1,
}: PasswordResetEmailProps): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redefinir Senha - Clínica Reabi</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica',
            'Arial', sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background-color: #f9fafb;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .email-wrapper {
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
          padding: 40px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .header-subtitle {
          font-size: 14px;
          opacity: 0.95;
        }
        .content {
          padding: 40px;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 24px;
          color: #374151;
        }
        .greeting strong {
          color: #7c3aed;
        }
        .message {
          font-size: 15px;
          line-height: 1.7;
          margin-bottom: 32px;
          color: #4b5563;
        }
        .cta-container {
          text-align: center;
          margin: 40px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
          color: #ffffff;
          padding: 14px 40px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
        }
        .security-notice {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 24px 0;
          border-radius: 4px;
          font-size: 14px;
          color: #92400e;
        }
        .security-notice strong {
          display: block;
          margin-bottom: 8px;
          color: #b45309;
        }
        .fallback-link {
          word-break: break-all;
          font-size: 12px;
          color: #6b7280;
          background-color: #f3f4f6;
          padding: 12px;
          border-radius: 4px;
          margin-top: 16px;
          font-family: 'Monaco', 'Courier New', monospace;
        }
        .footer {
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
          padding: 24px 40px;
          font-size: 13px;
          color: #6b7280;
          text-align: center;
        }
        .footer p {
          margin: 8px 0;
        }
        .footer-links {
          margin-top: 12px;
        }
        .footer-links a {
          color: #7c3aed;
          text-decoration: none;
          margin: 0 8px;
        }
        .footer-links a:hover {
          text-decoration: underline;
        }
        .divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 24px 0;
        }
        .highlight {
          background-color: #ede9fe;
          color: #6d28d9;
          padding: 0 4px;
          border-radius: 2px;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-wrapper">
          <!-- Header -->
          <div class="header">
            <h1>🔐 Redefinir Senha</h1>
            <p class="header-subtitle">Clínica Reabi - Painel de Atendimento</p>
          </div>

          <!-- Conteúdo Principal -->
          <div class="content">
            <p class="greeting">
              Olá,
            </p>

            <p class="message">
              Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
            </p>

            <!-- Call-to-Action -->
            <div class="cta-container">
              <a href="${resetLink}" class="cta-button">Redefinir Senha</a>
            </div>

            <!-- Aviso de Segurança -->
            <div class="security-notice">
              <strong>⚠️ Aviso de Segurança</strong>
              Este link expira em <span class="highlight">${expiryHours} hora</span>. Se você não solicitou esta alteração, ignore este email. Sua conta permanecerá segura.
            </div>

            <!-- Fallback Link -->
            <p style="font-size: 14px; color: #4b5563; margin-top: 24px;">
              Se o botão acima não funcionar, copie e cole este link no seu navegador:
            </p>
            <div class="fallback-link">${resetLink}</div>

            <hr class="divider">

            <!-- Informações Adicionais -->
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              <strong>💡 Dica:</strong> Guarde seu link seguro. Não compartilhe este email com outras pessoas.
            </p>
          </div>

          <!-- Rodapé -->
          <div class="footer">
            <p>© ${new Date().getFullYear()} Clínica Reabi. Todos os direitos reservados.</p>
            <p>Este é um email automático. Por favor, não responda a esta mensagem.</p>
            <div class="footer-links">
              <a href="https://clinicareabi.com.br">Site</a>
              <a href="mailto:suporte@clinicareabi.com.br">Suporte</a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim();
}

/**
 * Template de Email - Senha Alterada com Sucesso
 *
 * Enviado após a redefinição bem-sucedida da senha para confirmar ao usuário.
 */
export function PasswordChangedEmailTemplate(recipientName?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Senha Alterada - Clínica Reabi</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica',
            'Arial', sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background-color: #f9fafb;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .email-wrapper {
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          padding: 40px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .content {
          padding: 40px;
          text-align: center;
        }
        .success-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .content h2 {
          color: #10b981;
          margin-bottom: 16px;
          font-size: 22px;
        }
        .message {
          font-size: 15px;
          line-height: 1.7;
          color: #4b5563;
          margin-bottom: 24px;
        }
        .footer {
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
          padding: 24px 40px;
          font-size: 13px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-wrapper">
          <div class="header">
            <h1>✅ Sucesso!</h1>
          </div>
          <div class="content">
            <div class="success-icon">🎉</div>
            <h2>Senha Alterada com Sucesso</h2>
            <p class="message">
              Olá ${recipientName || "Profissional"},<br><br>
              Sua senha foi redefinida com sucesso. Você agora pode fazer login com sua nova senha.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Clínica Reabi. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim();
}
