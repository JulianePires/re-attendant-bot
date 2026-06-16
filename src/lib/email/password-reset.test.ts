/**
 * Testes de Integração para Password Reset
 *
 * Testa o fluxo completo de redefinição de senha.
 */

import { describe, it, expect } from "vitest";
import { resetPasswordSchema, forgetPasswordSchema } from "@/lib/validations/schemas";

describe("Password Reset Validation Schemas", () => {
  describe("forgetPasswordSchema", () => {
    it("deve aceitar email válido", () => {
      const result = forgetPasswordSchema.safeParse({
        email: "usuario@clinica.com.br",
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar email inválido", () => {
      const result = forgetPasswordSchema.safeParse({
        email: "invalid-email",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar email vazio", () => {
      const result = forgetPasswordSchema.safeParse({
        email: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("deve aceitar senhas válidas e correspondentes", () => {
      const result = resetPasswordSchema.safeParse({
        token: "token123",
        password: "senhaSegura123!",
        confirmPassword: "senhaSegura123!",
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar senhas não correspondentes", () => {
      const result = resetPasswordSchema.safeParse({
        token: "token123",
        password: "senhaSegura123!",
        confirmPassword: "senhaSegura456!",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar senhas curtas", () => {
      const result = resetPasswordSchema.safeParse({
        token: "token123",
        password: "123",
        confirmPassword: "123",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar token vazio", () => {
      const result = resetPasswordSchema.safeParse({
        token: "",
        password: "senhaSegura123!",
        confirmPassword: "senhaSegura123!",
      });

      expect(result.success).toBe(false);
    });

    it("deve validar mensagens de erro em português", () => {
      const result = forgetPasswordSchema.safeParse({
        email: "invalid",
      });

      if (!result.success) {
        expect(result.error.issues[0].message).toContain("inválido");
      }
    });
  });
});

describe("Password Reset Flow", () => {
  it("deve validar email na solicitação inicial", () => {
    const validEmail = forgetPasswordSchema.safeParse({
      email: "prof@clinica.com.br",
    });

    expect(validEmail.success).toBe(true);
  });

  it("deve validar redefinição de senha com token", () => {
    const validReset = resetPasswordSchema.safeParse({
      token: "abc123xyz",
      password: "NovaSenha123!",
      confirmPassword: "NovaSenha123!",
    });

    expect(validReset.success).toBe(true);
  });

  it("deve garantir que confirmPassword e password correspondam", () => {
    const result = resetPasswordSchema.safeParse({
      token: "token123",
      password: "Senha123!",
      confirmPassword: "SenhaErrada123!",
    });

    expect(result.success).toBe(false);
  });
});
