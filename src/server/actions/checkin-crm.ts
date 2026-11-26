"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  NOME_COOKIE_ACESSO,
  VALIDADE_ACESSO_SEGUNDOS,
  chaveAcessoConfere,
  gerarAutorizacao,
  obterDispositivoAutorizado,
} from "@/lib/crm/acesso";
import { confirmarNoCrm, localizarNoCrm } from "@/lib/crm/client";
import { abrirComprovante, emitirComprovante } from "@/lib/crm/comprovante";
import { checkinCrmHabilitado, obterChaveAcesso, obterConfigCrm } from "@/lib/crm/config";
import {
  classificarMotivo,
  classificarMotivoConfirmacao,
  type CategoriaMotivo,
  type CategoriaMotivoConfirmacao,
} from "@/lib/crm/contrato";
import { limitadorBuscas } from "@/lib/crm/limitador";
import { registrarChamadaCrm, registrarFalhaFila } from "@/lib/crm/log";
import {
  MENSAGEM_CHAVE_INVALIDA,
  MENSAGEM_CHEGADA_CONFIRMADA,
  MENSAGEM_ERRO_TECNICO,
  MENSAGEM_TELEFONE_INVALIDO,
  TEXTO_PADRAO_CONFIRMACAO,
  TEXTO_PADRAO_POR_CATEGORIA,
} from "@/lib/crm/mensagens";
import { validarTelefone } from "@/lib/crm/telefone";
import { codigoDoErro } from "@/lib/utils/erros";
import { entrarNaFilaPorConsulta } from "@/server/fila";

// Borda da action: o cliente pode mandar qualquer coisa. 20 caracteres cobrem
// o maior formato aceito com máscara: "+55 (11) 98765-4321".
const schemaEntradaTelefone = z.string().max(20);

type TipoRespostaNegocio =
  | "telefone_invalido"
  | "nao_encontrado"
  | "fora_da_janela"
  | "sem_agendamento"
  | "chegada_ja_registrada"
  | "impedimento";

export type RespostaLocalizarAgendamento =
  | {
      tipo: "encontrado";
      agendamento: { primeiroNome: string; hora: string; profissional: string };
      /** Opaco e cifrado (ADR 0003): o tablet só o devolve na confirmação. */
      comprovante: string;
    }
  | { tipo: TipoRespostaNegocio; mensagem: string }
  | { tipo: "indisponivel"; mensagem: string };

const INDISPONIVEL: RespostaLocalizarAgendamento = {
  tipo: "indisponivel",
  mensagem: MENSAGEM_ERRO_TECNICO,
};

// O dispositivo recebe a categoria, nunca o `motivo` bruto do CRM (RNF-001.3).
const TIPO_POR_CATEGORIA: Record<CategoriaMotivo, TipoRespostaNegocio> = {
  telefone_invalido: "telefone_invalido",
  nao_encontrado: "nao_encontrado",
  fora_da_janela: "fora_da_janela",
  sem_agendamento: "sem_agendamento",
  ja_registrado: "chegada_ja_registrada",
  desconhecido: "impedimento",
};

function responderNegocio(motivo: string, mensagem?: string): RespostaLocalizarAgendamento {
  const categoria = classificarMotivo(motivo);
  const texto = mensagem?.trim() || TEXTO_PADRAO_POR_CATEGORIA[categoria];
  return { tipo: TIPO_POR_CATEGORIA[categoria], mensagem: texto };
}

/**
 * Localiza o agendamento de agora pelo telefone (UC-001).
 * Retorna um resultado em vez de lançar erro, porque em produção o Next.js
 * esconde a mensagem de erros lançados por Server Actions.
 * O consulta_id não sai do servidor (RNF-001.3).
 */
export async function localizarAgendamentoCheckin(
  telefone: string
): Promise<RespostaLocalizarAgendamento> {
  // Server Actions são endpoints públicos: a flag é conferida aqui também,
  // não só na página (RF-001.16).
  if (!checkinCrmHabilitado()) return INDISPONIVEL;

  // Chamada direta à action sem o tablet ativado não chega ao CRM (RNF-001.4).
  const idDispositivo = await obterDispositivoAutorizado();
  if (!idDispositivo) return INDISPONIVEL;

  const entrada = schemaEntradaTelefone.safeParse(telefone);
  if (!entrada.success) {
    return { tipo: "telefone_invalido", mensagem: MENSAGEM_TELEFONE_INVALIDO };
  }

  const validacao = validarTelefone(entrada.data);
  if (!validacao.valido) {
    return { tipo: "telefone_invalido", mensagem: validacao.mensagem };
  }

  const config = obterConfigCrm();
  if (!config) return INDISPONIVEL;

  // Só conta o que chegaria ao CRM: telefone inválido não consome o limite (E10).
  if (!limitadorBuscas.permitir(idDispositivo)) return INDISPONIVEL;

  const inicio = Date.now();
  const { resultado, statusHttp, ok } = await localizarNoCrm(config, validacao.digitos);
  const categoria =
    resultado.tipo === "negocio" ? classificarMotivo(resultado.motivo) : resultado.tipo;

  registrarChamadaCrm({
    operacao: "localizar",
    categoria,
    causa: resultado.tipo === "tecnico" ? resultado.causa : undefined,
    motivo: resultado.tipo === "negocio" ? resultado.motivo : undefined,
    desconhecido: categoria === "desconhecido",
    statusHttp,
    ok,
    duracaoMs: Date.now() - inicio,
    correlacao: randomUUID(),
  });

  if (resultado.tipo === "negocio") return responderNegocio(resultado.motivo, resultado.mensagem);
  // Erro técnico: mensagem padrão do totem, nunca a `mensagem` do corpo (RF-001.11).
  if (resultado.tipo !== "encontrado") return INDISPONIVEL;

  const chave = obterChaveAcesso();
  if (!chave) return INDISPONIVEL;

  const { consultaId, nome, primeiroNome, hora, profissional } = resultado.agendamento;
  return {
    tipo: "encontrado",
    agendamento: { primeiroNome, hora, profissional },
    comprovante: emitirComprovante({ consultaId, nome, primeiroNome, idDispositivo }, chave),
  };
}

export type RespostaConfirmarChegada =
  | { tipo: "chegada_registrada"; mensagem: string }
  | { tipo: "nao_encontrada"; mensagem: string }
  | { tipo: "impedimento"; mensagem: string }
  | { tipo: "indisponivel"; mensagem: string };

const CONFIRMACAO_INDISPONIVEL: RespostaConfirmarChegada = {
  tipo: "indisponivel",
  mensagem: MENSAGEM_ERRO_TECNICO,
};

// O comprovante cifrado tem algumas centenas de caracteres.
const schemaEntradaComprovante = z.string().min(1).max(2048);

/**
 * Chegada confirmada (ou já registrada) no CRM: o paciente entra na fila normal, uma vez
 * por consulta (RF-001.17). Se a fila falhar, ele é mandado à recepção (UC-002 E8).
 */
async function entrarNaFilaDepoisDaConfirmacao(
  agendamento: { nome: string; consultaId: string },
  mensagem: string,
  correlacao: string
): Promise<RespostaConfirmarChegada> {
  try {
    await entrarNaFilaPorConsulta({ nome: agendamento.nome, consultaId: agendamento.consultaId });
    return { tipo: "chegada_registrada", mensagem };
  } catch (erro) {
    registrarFalhaFila({ correlacao, codigo: codigoDoErro(erro) });
    return CONFIRMACAO_INDISPONIVEL;
  }
}

/**
 * Confirma a chegada no CRM para o agendamento localizado nesta interação (UC-002).
 * Sem comprovante autêntico, válido e deste tablet, o CRM não é chamado (RNF-001.2).
 */
export async function confirmarChegadaCheckin(
  comprovante: string
): Promise<RespostaConfirmarChegada> {
  if (!checkinCrmHabilitado()) return CONFIRMACAO_INDISPONIVEL;

  const idDispositivo = await obterDispositivoAutorizado();
  const chave = obterChaveAcesso();
  if (!idDispositivo || !chave) return CONFIRMACAO_INDISPONIVEL;

  const entrada = schemaEntradaComprovante.safeParse(comprovante);
  if (!entrada.success) return CONFIRMACAO_INDISPONIVEL;

  const agendamento = abrirComprovante(entrada.data, chave, idDispositivo);
  if (!agendamento) return CONFIRMACAO_INDISPONIVEL;

  const config = obterConfigCrm();
  if (!config) return CONFIRMACAO_INDISPONIVEL;

  const inicio = Date.now();
  const correlacao = randomUUID();
  const { resultado, statusHttp, ok } = await confirmarNoCrm(config, agendamento.consultaId);
  const categoria =
    resultado.tipo === "negocio" ? classificarMotivoConfirmacao(resultado.motivo) : resultado.tipo;

  registrarChamadaCrm({
    operacao: "confirmar",
    categoria,
    causa: resultado.tipo === "tecnico" ? resultado.causa : undefined,
    motivo: resultado.tipo === "negocio" ? resultado.motivo : undefined,
    desconhecido: categoria === "desconhecido",
    statusHttp,
    ok,
    duracaoMs: Date.now() - inicio,
    correlacao,
  });

  if (resultado.tipo === "confirmado") {
    return entrarNaFilaDepoisDaConfirmacao(
      agendamento,
      resultado.mensagem?.trim() || MENSAGEM_CHEGADA_CONFIRMADA,
      correlacao
    );
  }
  // Erro técnico: mensagem padrão do totem, nunca a `mensagem` do corpo (RF-001.11).
  if (resultado.tipo !== "negocio") return CONFIRMACAO_INDISPONIVEL;

  const categoriaNegocio = categoria as CategoriaMotivoConfirmacao;
  const texto = resultado.mensagem?.trim() || TEXTO_PADRAO_CONFIRMACAO[categoriaNegocio];
  // ja_registrado é sucesso (RF-001.9).
  if (categoriaNegocio === "ja_registrado") {
    return entrarNaFilaDepoisDaConfirmacao(agendamento, texto, correlacao);
  }
  if (categoriaNegocio === "nao_encontrada") return { tipo: "nao_encontrada", mensagem: texto };
  return { tipo: "impedimento", mensagem: texto };
}

export type RespostaAtivarTotem = { ok: true } | { ok: false; mensagem: string };

const schemaEntradaChave = z.string().min(1).max(256);

/**
 * Ativa o tablet no totem de teste (RNF-001.4). A chave chega no corpo da action,
 * nunca na URL; o cookie guarda só o id do dispositivo e a assinatura.
 */
export async function ativarTotemCheckin(chave: string): Promise<RespostaAtivarTotem> {
  const chaveAcesso = obterChaveAcesso();
  if (!checkinCrmHabilitado() || !chaveAcesso) {
    return { ok: false, mensagem: MENSAGEM_ERRO_TECNICO };
  }

  const entrada = schemaEntradaChave.safeParse(chave);
  if (!entrada.success || !chaveAcessoConfere(entrada.data, chaveAcesso)) {
    return { ok: false, mensagem: MENSAGEM_CHAVE_INVALIDA };
  }

  (await cookies()).set(NOME_COOKIE_ACESSO, gerarAutorizacao(chaveAcesso), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/recepcao-crm",
    maxAge: VALIDADE_ACESSO_SEGUNDOS,
  });

  return { ok: true };
}
