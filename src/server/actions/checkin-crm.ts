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
import { localizarNoCrm } from "@/lib/crm/client";
import { checkinCrmHabilitado, obterChaveAcesso, obterConfigCrm } from "@/lib/crm/config";
import { classificarMotivo, type CategoriaMotivo } from "@/lib/crm/contrato";
import { limitadorBuscas } from "@/lib/crm/limitador";
import { registrarLocalizacao } from "@/lib/crm/log";
import {
  MENSAGEM_CHAVE_INVALIDA,
  MENSAGEM_ERRO_TECNICO,
  MENSAGEM_TELEFONE_INVALIDO,
  TEXTO_PADRAO_POR_CATEGORIA,
} from "@/lib/crm/mensagens";
import { validarTelefone } from "@/lib/crm/telefone";

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
  const resultado = await localizarNoCrm(config, validacao.digitos);
  const categoria =
    resultado.tipo === "negocio" ? classificarMotivo(resultado.motivo) : resultado.tipo;

  registrarLocalizacao({
    categoria,
    motivo: resultado.tipo === "negocio" ? resultado.motivo : undefined,
    desconhecido: categoria === "desconhecido",
    duracaoMs: Date.now() - inicio,
    correlacao: randomUUID(),
  });

  if (resultado.tipo === "negocio") return responderNegocio(resultado.motivo, resultado.mensagem);
  // Provisório (S1-01): erros técnicos ganham tratamento próprio no S1-03.
  if (resultado.tipo !== "encontrado") return INDISPONIVEL;

  const { primeiroNome, hora, profissional } = resultado.agendamento;
  return { tipo: "encontrado", agendamento: { primeiroNome, hora, profissional } };
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
