import { z } from "zod";

/**
 * Configuração do CRM, lida a cada chamada e só no servidor.
 * Variável faltando deixa o totem de teste indisponível, sem impedir o app de
 * subir: o /recepcao precisa funcionar mesmo sem o CRM (RNF-001.8).
 *
 * - CRM_CHECKIN_ENABLED: "true" liga o totem de teste (/recepcao-crm)
 * - CRM_BASE_URL: endereço das funções do CRM (ex.: https://<ref>.supabase.co/functions/v1)
 * - CRM_API_KEY: chave enviada no header x-api-key (segredo; nunca NEXT_PUBLIC_)
 * - CRM_TIMEOUT_MS: tempo limite por chamada, padrão 8000 (RNF-001.7)
 */

const TEMPO_LIMITE_PADRAO_MS = 8000;

const schemaConfigCrm = z.object({
  CRM_BASE_URL: z.string().url(),
  CRM_API_KEY: z.string().min(1),
  CRM_TIMEOUT_MS: z.coerce.number().int().positive().default(TEMPO_LIMITE_PADRAO_MS),
});

export type ConfigCrm = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
};

export function checkinCrmHabilitado(): boolean {
  return process.env.CRM_CHECKIN_ENABLED === "true";
}

export function obterConfigCrm(): ConfigCrm | null {
  const resultado = schemaConfigCrm.safeParse({
    CRM_BASE_URL: process.env.CRM_BASE_URL,
    CRM_API_KEY: process.env.CRM_API_KEY,
    CRM_TIMEOUT_MS: process.env.CRM_TIMEOUT_MS || undefined,
  });

  if (!resultado.success) return null;

  return {
    baseUrl: resultado.data.CRM_BASE_URL,
    apiKey: resultado.data.CRM_API_KEY,
    timeoutMs: resultado.data.CRM_TIMEOUT_MS,
  };
}
