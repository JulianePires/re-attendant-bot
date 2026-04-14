import { z } from "zod";

// ================================================================
// ENUMS E CONSTANTES
// Usar constantes em vez de enums TypeScript evita emissão de código
// desnecessário no bundle e garante compatibilidade com o Zod.
// ================================================================

export const TipoChamada = {
  NORMAL: "normal",
  URGENTE: "urgente",
} as const;

export const StatusAtendimento = {
  AGUARDANDO: "aguardando",
  FINALIZADO: "finalizado",
} as const;

export const Role = {
  PROFISSIONAL: "profissional",
  ADMIN: "admin",
} as const;

// ================================================================
// SCHEMAS ZOD
// Fonte única da verdade para validação em formulários (client)
// e em Server Actions (server). O mesmo schema valida ambos os lados.
// ================================================================

export const schemaCadastroProfissional = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos numéricos"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export const schemaLoginEmail = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Schema para o Kiosk (entrada de paciente na fila)
export const schemaEntradaKiosk = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipoChamada: z.enum([TipoChamada.NORMAL, TipoChamada.URGENTE]),
});

// ================================================================
// TIPOS INFERIDOS
// Derivados dos schemas Zod para não duplicar definições.
// ================================================================

export type FormCadastroProfissional = z.infer<typeof schemaCadastroProfissional>;
export type FormLoginEmail = z.infer<typeof schemaLoginEmail>;
export type FormEntradaKiosk = z.infer<typeof schemaEntradaKiosk>;

export type TipoChamadaValue = (typeof TipoChamada)[keyof typeof TipoChamada];
export type StatusAtendimentoValue = (typeof StatusAtendimento)[keyof typeof StatusAtendimento];
export type RoleValue = (typeof Role)[keyof typeof Role];

// ================================================================
// TIPOS DE DOMÍNIO
// Representam as entidades do banco de dados no frontend.
// ================================================================

export type AtendimentoNaFila = {
  id: string;
  nomePaciente: string;
  tipoChamada: TipoChamadaValue;
  status: StatusAtendimentoValue;
  criadoEm: Date;
  finalizadoEm: Date | null;
};
