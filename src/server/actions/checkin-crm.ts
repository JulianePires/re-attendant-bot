"use server";

import { z } from "zod";
import { localizarNoCrm } from "@/lib/crm/client";
import { checkinCrmHabilitado, obterConfigCrm } from "@/lib/crm/config";
import { MENSAGEM_ERRO_TECNICO, MENSAGEM_TELEFONE_INVALIDO } from "@/lib/crm/mensagens";
import { validarTelefone } from "@/lib/crm/telefone";

// Borda da action: o cliente pode mandar qualquer coisa. 20 caracteres cobrem
// o maior formato aceito com máscara: "+55 (11) 98765-4321".
const schemaEntradaTelefone = z.string().max(20);

export type RespostaLocalizarAgendamento =
  | {
      tipo: "encontrado";
      agendamento: { primeiroNome: string; hora: string; profissional: string };
    }
  | { tipo: "telefone_invalido"; mensagem: string }
  | { tipo: "indisponivel"; mensagem: string };

const INDISPONIVEL: RespostaLocalizarAgendamento = {
  tipo: "indisponivel",
  mensagem: MENSAGEM_ERRO_TECNICO,
};

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

  const resultado = await localizarNoCrm(config, validacao.digitos);

  // Provisório (S1-01): erros de negócio e técnicos ganham tratamento próprio em S1-02 e S1-03.
  if (resultado.tipo !== "encontrado") return INDISPONIVEL;

  const { primeiroNome, hora, profissional } = resultado.agendamento;
  return { tipo: "encontrado", agendamento: { primeiroNome, hora, profissional } };
}
