import "server-only";

import type { ConfigCrm } from "./config";
import {
  interpretarRespostaConfirmar,
  interpretarRespostaLocalizar,
  montarRequisicaoConfirmar,
  montarRequisicaoLocalizar,
  type ResultadoConfirmacao,
  type ResultadoLocalizacao,
} from "./contrato";

type FalhaTecnica = { tipo: "tecnico"; causa: "sem_resposta" | "tempo_esgotado" };

export type RespostaCrm<Resultado = ResultadoLocalizacao> = {
  resultado: Resultado;
  /** null quando não houve resposta (rede ou tempo esgotado). */
  statusHttp: number | null;
  /** O campo `ok` do corpo, quando for booleano; só para o log técnico. */
  ok: boolean | null;
};

function lerOk(corpo: unknown): boolean | null {
  if (corpo && typeof corpo === "object" && "ok" in corpo && typeof corpo.ok === "boolean") {
    return corpo.ok;
  }
  return null;
}

// AbortSignal.timeout rejeita com uma DOMException "TimeoutError" (alguns ambientes usam
// "AbortError"). DOMException nem sempre é instanceof Error, então só o nome é conferido.
function foiTempoEsgotado(erro: unknown): boolean {
  const nome = typeof erro === "object" && erro !== null && "name" in erro ? erro.name : undefined;
  return nome === "TimeoutError" || nome === "AbortError";
}

/**
 * Transporte HTTP do CRM. A chave de API só existe aqui, no servidor (RNF-001.1).
 * Uma chamada só, sem nova tentativa, com tempo limite de `CRM_TIMEOUT_MS`
 * (ADR 0002, que também vale para a confirmação, ADR 0003).
 */
async function chamarCrm<Resultado>(
  config: ConfigCrm,
  { url, init }: { url: string; init: RequestInit },
  interpretar: (status: number, corpo: unknown) => Resultado
): Promise<RespostaCrm<Resultado | FalhaTecnica>> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (erro) {
    return {
      resultado: {
        tipo: "tecnico",
        causa: foiTempoEsgotado(erro) ? "tempo_esgotado" : "sem_resposta",
      },
      statusHttp: null,
      ok: null,
    };
  }

  let corpo: unknown = null;
  try {
    corpo = await resposta.json();
  } catch (erro) {
    // O tempo limite também vale para a leitura do corpo.
    if (foiTempoEsgotado(erro)) {
      return {
        resultado: { tipo: "tecnico", causa: "tempo_esgotado" },
        statusHttp: resposta.status,
        ok: null,
      };
    }
  }

  return {
    resultado: interpretar(resposta.status, corpo),
    statusHttp: resposta.status,
    ok: lerOk(corpo),
  };
}

export function localizarNoCrm(
  config: ConfigCrm,
  telefone: string
): Promise<RespostaCrm<ResultadoLocalizacao>> {
  return chamarCrm(
    config,
    montarRequisicaoLocalizar(config, telefone),
    interpretarRespostaLocalizar
  );
}

export function confirmarNoCrm(
  config: ConfigCrm,
  consultaId: string
): Promise<RespostaCrm<ResultadoConfirmacao>> {
  return chamarCrm(
    config,
    montarRequisicaoConfirmar(config, consultaId),
    interpretarRespostaConfirmar
  );
}
