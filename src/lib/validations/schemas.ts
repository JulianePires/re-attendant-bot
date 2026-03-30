import { z } from "zod";

/**
 * Validação matemática de CPF brasileiro
 * Aplica a fórmula dos dígitos verificadores conforme a Receita Federal.
 * @param cpf - String de 11 dígitos numéricos
 * @returns true se o CPF é válido, false caso contrário
 */
function isValidCPF(cpf: string): boolean {
  // Remove caracteres especiais e valida formato
  const cleanCPF = cpf.replace(/\D/g, "");

  // CPF deve ter exatamente 11 dígitos
  if (cleanCPF.length !== 11) {
    return false;
  }

  // Rejeita CPFs com todos os dígitos iguais (inválidos por definição)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  // Cálculo do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;

  // Cálculo do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;

  // Valida se os dígitos calculados correspondem aos informados
  return firstDigit === parseInt(cleanCPF[9]) && secondDigit === parseInt(cleanCPF[10]);
}

export const patientQueueSchema = z.object({
  nome: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres."),
});

export const adminRegistrationSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("E-mail inválido."),
  cpf: z
    .string()
    .length(11, "O CPF deve conter exatamente 11 dígitos.")
    .refine((cpf) => /^\d{11}$/.test(cpf), "O CPF deve conter apenas números.")
    .refine((cpf) => isValidCPF(cpf), "CPF inválido. Verifique os dígitos verificadores."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const forgetPasswordSchema = z.object({
  email: z.string().email("E-mail inválido."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token de recuperação inválido."),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "A confirmação deve ter pelo menos 6 caracteres."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não correspondem.",
    path: ["confirmPassword"],
  });
