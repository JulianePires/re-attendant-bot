import "server-only";

import type { ConfigCrm } from "./config";
import {
  interpretarRespostaLocalizar,
  montarRequisicaoLocalizar,
  type ResultadoLocalizacao,
} from "./contrato";

/**
 * Transporte HTTP do CRM. A chave de API só existe aqui, no servidor (RNF-001.1).
 * Tempo esgotado e falha de rede viram erro técnico (RNF-001.7, RNF-001.8).
 */
export async function localizarNoCrm(
  config: ConfigCrm,
  telefone: string
): Promise<ResultadoLocalizacao> {
  const { url, init } = montarRequisicaoLocalizar(config, telefone);

  try {
    const resposta = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    const corpo: unknown = await resposta.json().catch(() => null);
    return interpretarRespostaLocalizar(resposta.status, corpo);
  } catch {
    return { tipo: "tecnico", causa: "sem_resposta" };
  }
}
