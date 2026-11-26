import "server-only";

import { createHash } from "node:crypto";
import { montarNotificacaoSemAgendamento } from "@/lib/crm/mensagens";
import { prisma } from "@/lib/prisma";
import { codigoDoErro } from "@/lib/utils/erros";
import { StatusAtendimento, TipoChamada, type TipoChamadaValue } from "@/types";

/**
 * Entrada na fila feita pelo servidor. Fica fora de "use server" de propósito:
 * uma Server Action exportada seria um endpoint público (ADR 0004).
 */

type ClienteNotificacao = {
  user: {
    findMany: (args: {
      where: { role: { in: string[] } };
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
  };
  notificacao: {
    createMany: (args: {
      data: Array<{
        usuarioId: string;
        titulo: string;
        mensagem: string;
        tipo: "URGENTE" | "NORMAL";
      }>;
    }) => Promise<unknown>;
  };
};

export async function criarNotificacoesParaEquipe(
  cliente: ClienteNotificacao,
  params: { nomePaciente: string; tipoChamada: TipoChamadaValue; semAgendamento?: boolean }
) {
  const profissionais = await cliente.user.findMany({
    where: { role: { in: ["profissional", "admin"] } },
    select: { id: true },
  });

  if (profissionais.length === 0) return;

  // Quem chamou pelo totem de teste sem agendamento aparece assim para a equipe (RF-001.18).
  const titulo = params.semAgendamento
    ? "Sem agendamento: falar com um profissional"
    : params.tipoChamada === TipoChamada.URGENTE
      ? "Paciente urgente na fila"
      : "Novo paciente na fila";
  const mensagem = params.semAgendamento
    ? montarNotificacaoSemAgendamento(params.nomePaciente)
    : `Novo Paciente: ${params.nomePaciente}`;

  await cliente.notificacao.createMany({
    data: profissionais.map((profissional) => ({
      usuarioId: profissional.id,
      titulo,
      mensagem,
      tipo: params.tipoChamada === TipoChamada.URGENTE ? "URGENTE" : "NORMAL",
    })),
  });
}

/** Só o hash vai para o banco: a TV lê a tabela com a chave pública (ADR 0004). */
export function hashConsulta(consultaId: string): string {
  return createHash("sha256").update(consultaId).digest("hex");
}

/**
 * Coloca na fila normal o paciente com chegada confirmada no CRM, uma vez por consulta
 * (RF-001.7, RF-001.17). Lança em falha de banco; o chamador decide o que mostrar (E8).
 */
export async function entrarNaFilaPorConsulta(dados: {
  nome: string;
  consultaId: string;
}): Promise<"criado" | "existente"> {
  const consultaHash = hashConsulta(dados.consultaId);

  const existente = await prisma.atendimento.findUnique({ where: { consultaHash } });
  if (existente) return "existente";

  const nomePaciente = dados.nome.trim();
  try {
    // Atendimento e aviso à equipe juntos: ou os dois, ou nenhum.
    await prisma.$transaction(async (tx) => {
      await tx.atendimento.create({
        data: {
          nomePaciente,
          tipoChamada: TipoChamada.NORMAL,
          status: StatusAtendimento.AGUARDANDO,
          consultaHash,
        },
      });
      await criarNotificacoesParaEquipe(tx, { nomePaciente, tipoChamada: TipoChamada.NORMAL });
    });
    return "criado";
  } catch (erro) {
    // Outra confirmação da mesma consulta criou o atendimento entre a busca e o create.
    if (codigoDoErro(erro) === "P2002") return "existente";
    throw erro;
  }
}
