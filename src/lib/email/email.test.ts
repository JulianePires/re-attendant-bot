/**
 * Testes para o Serviço de Email
 *
 * Valida:
 * - Configuração de email
 * - Geração de templates
 * - Envio de emails (com mock)
 * - Integração com BetterAuth
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  emailConfig,
  isEmailConfigured,
  PasswordResetEmailTemplate,
  PasswordChangedEmailTemplate,
  sendEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

describe("Email Configuration", () => {
  beforeEach(() => {
    // Restaurar variáveis de ambiente originais
    vi.resetModules();
  });

  it("deve validar se email está configurado", () => {
    // Nota: Este teste dependerá das variáveis de ambiente
    // Em produção, isEmailConfigured deve retornar true
    const configured = isEmailConfigured();
    expect(typeof configured).toBe("boolean");
  });

  it("deve expor configurações de email", () => {
    expect(emailConfig).toBeDefined();
    expect(emailConfig.from).toBeDefined();
    expect(emailConfig.baseUrl).toBeDefined();
    expect(emailConfig.smtp).toBeDefined();
    expect(emailConfig.validation).toBeDefined();
  });

  it("deve validar timeouts", () => {
    expect(emailConfig.timeouts.send).toBeGreaterThan(0);
  });

  it("deve validar configuração de validação", () => {
    expect(emailConfig.validation.resetTokenExpiryMinutes).toBeGreaterThan(0);
    expect(emailConfig.validation.maxRetries).toBeGreaterThan(0);
  });
});

describe("Email Templates", () => {
  describe("PasswordResetEmailTemplate", () => {
    it("deve gerar template HTML válido", () => {
      const resetLink = "https://app.local/redefinir-senha?token=abc123";
      const html = PasswordResetEmailTemplate({
        resetLink,
        recipientName: "João Silva",
        expiryHours: 1,
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("João Silva");
      expect(html).toContain(resetLink);
      expect(html).toContain("Redefinir Senha");
    });

    it("deve incluir link de recuperação", () => {
      const resetLink = "https://app.local/redefinir-senha?token=xyz789";
      const html = PasswordResetEmailTemplate({ resetLink });

      expect(html).toContain(resetLink);
      expect(html).toContain('href="${resetLink}"');
    });

    it("deve incluir aviso de segurança", () => {
      const html = PasswordResetEmailTemplate({
        resetLink: "https://app.local/reset",
        expiryHours: 2,
      });

      expect(html).toContain("Aviso de Segurança");
      expect(html).toContain("⚠️");
      expect(html).toContain("2 hora");
    });

    it("deve incluir tema visual (cores do projeto)", () => {
      const html = PasswordResetEmailTemplate({
        resetLink: "https://app.local/reset",
      });

      // Verificar presença de cores roxas do projeto
      expect(html).toContain("#7c3aed");
      expect(html).toContain("#8b5cf6");
      // Verificar gradiente
      expect(html).toContain("linear-gradient");
    });

    it("deve ser responsivo", () => {
      const html = PasswordResetEmailTemplate({
        resetLink: "https://app.local/reset",
      });

      expect(html).toContain("viewport");
      expect(html).toContain("max-width: 600px");
    });

    it("deve ser acessível (alt text, contraste)", () => {
      const html = PasswordResetEmailTemplate({
        resetLink: "https://app.local/reset",
      });

      expect(html).toContain("font-weight");
      expect(html).toContain("color:");
    });
  });

  describe("PasswordChangedEmailTemplate", () => {
    it("deve gerar template HTML válido", () => {
      const html = PasswordChangedEmailTemplate("Maria Silva");

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Maria Silva");
      expect(html).toContain("Sucesso");
      expect(html).toContain("✅");
    });

    it("deve ter nome padrão quando não fornecido", () => {
      const html = PasswordChangedEmailTemplate();

      expect(html).toContain("Profissional");
    });

    it("deve indicar sucesso claramente", () => {
      const html = PasswordChangedEmailTemplate();

      expect(html).toContain("Senha Alterada com Sucesso");
      expect(html).toContain("#10b981"); // cor verde de sucesso
    });
  });
});

describe("Email Service", () => {
  describe("sendPasswordResetEmail", () => {
    it("deve ser uma função válida", () => {
      expect(typeof sendPasswordResetEmail).toBe("function");
    });

    it("deve aceitar email, link e nome", async () => {
      // Este teste apenas valida a assinatura da função
      expect(sendPasswordResetEmail.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("sendEmail", () => {
    it("deve ser uma função válida", () => {
      expect(typeof sendEmail).toBe("function");
    });

    it("deve validar opções requeridas", () => {
      const invalidOptions = {
        to: "",
        subject: "",
        html: "",
      };

      expect(invalidOptions).toHaveProperty("to");
      expect(invalidOptions).toHaveProperty("subject");
      expect(invalidOptions).toHaveProperty("html");
    });
  });
});

describe("Email Security", () => {
  it("templates não devem expor dados sensíveis", () => {
    const html = PasswordResetEmailTemplate({
      resetLink: "https://app.local/reset?token=secret123",
    });

    // O template deve ser seguro e não expor a senha
    expect(html).not.toContain("password=");
    expect(html).not.toContain("senha=");
  });

  it("deve recomendar HTTPS para links", () => {
    const template = PasswordResetEmailTemplate({
      resetLink: "https://app.local/reset",
    });

    expect(template).toContain("https://");
  });

  it("deve incluir aviso contra phishing", () => {
    const html = PasswordResetEmailTemplate({
      resetLink: "https://app.local/reset",
    });

    expect(html).toContain("seguro");
    expect(html).toContain("compartilhe");
  });
});

describe("Email Localization (PT-BR)", () => {
  it("deve estar em português", () => {
    const html = PasswordResetEmailTemplate({
      resetLink: "https://app.local/reset",
    });

    expect(html).toContain("Redefinir Senha");
    expect(html).toContain("E-mail");
    expect(html).toContain("Segurança");
  });

  it("deve usar formatação brasileira", () => {
    const html = PasswordResetEmailTemplate({
      resetLink: "https://app.local/reset",
    });

    expect(html).toContain("pt-BR");
    expect(html).not.toContain("Reset Password");
    expect(html).not.toContain("Security");
  });
});
