import { z } from "zod";

/**
 * Único ponto do código que conhece o formato do CRM (RNF-001.13).
 * Contrato: especificação da cliente e verificação na API real (REQ-001, "Contrato do CRM").
 */

const CAMINHO_LOCALIZAR = "/agenda/localizar";
const CAMINHO_CONFIRMAR = "/agenda/confirmar";

export type ConfigRequisicaoCrm = {
  baseUrl: string;
  apiKey: string;
};

export type AgendamentoLocalizado = {
  consultaId: string;
  /** Nome completo: só no servidor e no comprovante cifrado, para a fila (RF-001.17). */
  nome: string;
  primeiroNome: string;
  hora: string;
  profissional: string;
};

export type ResultadoLocalizacao =
  | { tipo: "encontrado"; agendamento: AgendamentoLocalizado }
  | { tipo: "negocio"; motivo: string; mensagem?: string }
  | {
      tipo: "tecnico";
      causa: "status_http" | "resposta_invalida" | "sem_resposta" | "tempo_esgotado";
    };

const textoObrigatorio = z.string().min(1);

// Procedimento e `mensagem` ficam de fora: o totem não os exibe (RNF-001.5, Q-08) e a
// confirmação usa mensagem própria (RF-001.3). O nome completo é guardado para a fila
// (RF-001.17); sem ele, usa-se o primeiro nome.
const schemaSucessoLocalizar = z.object({
  ok: z.literal(true),
  consulta_id: textoObrigatorio,
  nome: z.string().optional(),
  primeiro_nome: textoObrigatorio,
  hora: textoObrigatorio,
  profissional: textoObrigatorio,
});

const schemaErroNegocio = z.object({
  ok: z.literal(false),
  motivo: z.string(),
  mensagem: z.string().optional(),
});

export type CategoriaMotivo =
  | "telefone_invalido"
  | "nao_encontrado"
  | "fora_da_janela"
  | "sem_agendamento"
  | "ja_registrado"
  | "desconhecido";

// Motivos da localização (REQ-001, tabela de motivos). `nao_encontrada` só existe
// na confirmação; aqui ela cai em "desconhecido" como qualquer motivo novo.
const CATEGORIA_POR_MOTIVO: Record<string, CategoriaMotivo> = {
  telefone_invalido: "telefone_invalido",
  paciente_nao_encontrado: "nao_encontrado",
  fora_da_janela: "fora_da_janela",
  sem_agendamento_agora: "sem_agendamento",
  ja_registrado: "ja_registrado",
};

export function classificarMotivo(motivo: string): CategoriaMotivo {
  return Object.hasOwn(CATEGORIA_POR_MOTIVO, motivo)
    ? CATEGORIA_POR_MOTIVO[motivo]
    : "desconhecido";
}

function montarRequisicao(
  config: ConfigRequisicaoCrm,
  caminho: string,
  corpo: Record<string, string>
): { url: string; init: RequestInit } {
  return {
    url: `${config.baseUrl.replace(/\/+$/, "")}${caminho}`,
    init: {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
    },
  };
}

export function montarRequisicaoLocalizar(
  config: ConfigRequisicaoCrm,
  telefone: string
): { url: string; init: RequestInit } {
  return montarRequisicao(config, CAMINHO_LOCALIZAR, { telefone });
}

export function montarRequisicaoConfirmar(
  config: ConfigRequisicaoCrm,
  consultaId: string
): { url: string; init: RequestInit } {
  return montarRequisicao(config, CAMINHO_CONFIRMAR, { consulta_id: consultaId });
}

/**
 * Classifica primeiro pelo status HTTP (RNF-001.9): o 401 do CRM também traz
 * `ok: false`, mas é erro técnico, não de negócio (RF-001.11).
 */
export function interpretarRespostaLocalizar(status: number, corpo: unknown): ResultadoLocalizacao {
  if (status < 200 || status > 299) {
    return { tipo: "tecnico", causa: "status_http" };
  }

  const sucesso = schemaSucessoLocalizar.safeParse(corpo);
  if (sucesso.success) {
    const { consulta_id, nome, primeiro_nome, hora, profissional } = sucesso.data;
    return {
      tipo: "encontrado",
      agendamento: {
        consultaId: consulta_id,
        nome: nome?.trim() || primeiro_nome,
        primeiroNome: primeiro_nome,
        hora,
        profissional,
      },
    };
  }

  const negocio = schemaErroNegocio.safeParse(corpo);
  if (negocio.success) {
    return { tipo: "negocio", motivo: negocio.data.motivo, mensagem: negocio.data.mensagem };
  }

  return { tipo: "tecnico", causa: "resposta_invalida" };
}

// ---- Confirmação de chegada (UC-002) ----

export type ResultadoConfirmacao =
  | { tipo: "confirmado"; status: string; mensagem?: string }
  | { tipo: "negocio"; motivo: string; mensagem?: string }
  | {
      tipo: "tecnico";
      causa: "status_http" | "resposta_invalida" | "sem_resposta" | "tempo_esgotado";
    };

export type CategoriaMotivoConfirmacao = "ja_registrado" | "nao_encontrada" | "desconhecido";

const schemaSucessoConfirmar = z.object({
  ok: z.literal(true),
  status: textoObrigatorio,
  mensagem: z.string().optional(),
});

// `ja_registrado` é sucesso (RF-001.9); `nao_encontrada` só existe na confirmação.
const CATEGORIA_POR_MOTIVO_CONFIRMACAO: Record<string, CategoriaMotivoConfirmacao> = {
  ja_registrado: "ja_registrado",
  nao_encontrada: "nao_encontrada",
};

export function classificarMotivoConfirmacao(motivo: string): CategoriaMotivoConfirmacao {
  return Object.hasOwn(CATEGORIA_POR_MOTIVO_CONFIRMACAO, motivo)
    ? CATEGORIA_POR_MOTIVO_CONFIRMACAO[motivo]
    : "desconhecido";
}

/** Mesma regra da localização: o status HTTP decide antes do corpo (RNF-001.9). */
export function interpretarRespostaConfirmar(status: number, corpo: unknown): ResultadoConfirmacao {
  if (status < 200 || status > 299) {
    return { tipo: "tecnico", causa: "status_http" };
  }

  const sucesso = schemaSucessoConfirmar.safeParse(corpo);
  if (sucesso.success) {
    return { tipo: "confirmado", status: sucesso.data.status, mensagem: sucesso.data.mensagem };
  }

  const negocio = schemaErroNegocio.safeParse(corpo);
  if (negocio.success) {
    return { tipo: "negocio", motivo: negocio.data.motivo, mensagem: negocio.data.mensagem };
  }

  return { tipo: "tecnico", causa: "resposta_invalida" };
}
