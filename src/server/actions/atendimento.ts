"use server";

import { prisma } from "@/lib/prisma";
import { obterTurnoAtual } from "@/lib/utils/turnos";
import { StatusAtendimento, TipoChamada, TipoChamadaValue } from "@/types";
import { z } from "zod";

type NotificacaoCreateManyArgs = {
  data: Array<{
    usuarioId: string;
    titulo: string;
    mensagem: string;
    tipo: "URGENTE" | "NORMAL";
  }>;
};

type PrismaWithNotificacao = typeof prisma & {
  notificacao: {
    createMany: (args: NotificacaoCreateManyArgs) => Promise<unknown>;
  };
};

const prismaWithNotificacao = prisma as PrismaWithNotificacao;

const schemaAtendimentoId = z.string().cuid("ID de atendimento inválido");

async function criarNotificacoesParaEquipe(params: {
  nomePaciente: string;
  tipoChamada: TipoChamadaValue;
}) {
  const profissionais = await prisma.user.findMany({
    where: {
      role: {
        in: ["profissional", "admin"],
      },
    },
    select: {
      id: true,
    },
  });

  if (profissionais.length === 0) {
    return;
  }

  await prismaWithNotificacao.notificacao.createMany({
    data: profissionais.map((profissional) => ({
      usuarioId: profissional.id,
      titulo:
        params.tipoChamada === TipoChamada.URGENTE
          ? "Paciente urgente na fila"
          : "Novo paciente na fila",
      mensagem: `Novo Paciente: ${params.nomePaciente}`,
      tipo: params.tipoChamada === TipoChamada.URGENTE ? "URGENTE" : "NORMAL",
    })),
  });
}

// Schema simplificado: atendimento não tem mais relação com User
const schemaAtendimentoNaFila = z.object({
  id: z.string(),
  nomePaciente: z.string(),
  tipoChamada: z.enum([TipoChamada.NORMAL, TipoChamada.URGENTE]),
  status: z.enum([StatusAtendimento.AGUARDANDO, StatusAtendimento.FINALIZADO]),
  criadoEm: z.date(),
  finalizadoEm: z.date().nullable(),
});

/**
 * AÇÃO PRINCIPAL DO KIOSK
 * Registra um novo atendimento na fila.
 * Não cria usuário - salva o nome direto no atendimento.
 */
export async function registrarEEntrarNaFila(dados: {
  nome: string;
  tipoChamada: TipoChamadaValue;
}) {
  try {
    const nomePaciente = dados.nome.trim();

    if (nomePaciente.length < 2) {
      throw new Error("Nome deve ter pelo menos 2 caracteres.");
    }

    // Cria o atendimento diretamente, sem relação com User
    const atendimento = await prisma.atendimento.create({
      data: {
        nomePaciente,
        tipoChamada: dados.tipoChamada,
        status: StatusAtendimento.AGUARDANDO,
      },
    });

    // Notifica os profissionais
    await criarNotificacoesParaEquipe({
      nomePaciente,
      tipoChamada: dados.tipoChamada,
    });

    return atendimento;
  } catch (error) {
    console.error("[registrarEEntrarNaFila]", error);
    throw new Error("Não foi possível registrar o atendimento.");
  }
}

export async function finalizarAtendimento(atendimentoId: string) {
  try {
    const atendimentoIdValidado = schemaAtendimentoId.parse(atendimentoId);

    return await prisma.atendimento.update({
      where: { id: atendimentoIdValidado },
      data: {
        status: StatusAtendimento.FINALIZADO,
        finalizadoEm: new Date(),
      },
    });
  } catch (error) {
    console.error("[finalizarAtendimento]", error);
    throw new Error("Não foi possível finalizar o atendimento.");
  }
}

export async function obterFilaAtiva() {
  try {
    const atendimentos = await prisma.atendimento.findMany({
      where: { status: StatusAtendimento.AGUARDANDO },
      orderBy: [{ tipoChamada: "desc" }, { criadoEm: "asc" }],
      select: {
        id: true,
        nomePaciente: true,
        tipoChamada: true,
        status: true,
        criadoEm: true,
        finalizadoEm: true,
      },
    });

    return atendimentos.map((item) => schemaAtendimentoNaFila.parse(item));
  } catch (error) {
    console.error("[obterFilaAtiva]", error);
    throw new Error("Não foi possível carregar a fila ativa.");
  }
}

export async function obterAtendimentosDoDia() {
  try {
    const turnoAtual = obterTurnoAtual(new Date());

    const atendimentos = await prisma.atendimento.findMany({
      where: {
        status: StatusAtendimento.FINALIZADO,
        arquivadoTurno: false,
        finalizadoEm: {
          gte: turnoAtual.inicio,
          lte: turnoAtual.fim,
        },
      } as any,
      orderBy: { finalizadoEm: "desc" },
      select: {
        id: true,
        nomePaciente: true,
        tipoChamada: true,
        status: true,
        criadoEm: true,
        finalizadoEm: true,
      },
    });

    return atendimentos.map((item) => schemaAtendimentoNaFila.parse(item));
  } catch (error) {
    console.error("[obterAtendimentosDoDia]", error);
    throw new Error("Não foi possível carregar os atendimentos do dia.");
  }
}

export async function arquivarAtendimentosDoTurno() {
  try {
    const turnoAtual = obterTurnoAtual(new Date());

    const resultado = await prisma.atendimento.updateMany({
      where: {
        status: StatusAtendimento.FINALIZADO,
        arquivadoTurno: false,
        finalizadoEm: {
          gte: turnoAtual.inicio,
          lte: turnoAtual.fim,
        },
      } as any,
      data: {
        arquivadoTurno: true,
      } as any,
    });

    return {
      totalArquivados: resultado.count,
      turno: turnoAtual,
    };
  } catch (error) {
    console.error("[arquivarAtendimentosDoTurno]", error);
    throw new Error("Não foi possível limpar os atendimentos do turno.");
  }
}

export async function obterResumoAtendimento(atendimentoId: string) {
  try {
    const atendimentoIdValidado = schemaAtendimentoId.parse(atendimentoId);

    const atendimento = await prisma.atendimento.findUnique({
      where: { id: atendimentoIdValidado },
      select: {
        nomePaciente: true,
        tipoChamada: true,
      },
    });

    if (!atendimento) {
      return null;
    }

    return {
      nomePaciente: atendimento.nomePaciente,
      tipoChamada: atendimento.tipoChamada as TipoChamadaValue,
    };
  } catch (error) {
    console.error("[obterResumoAtendimento]", error);
    return null;
  }
}
