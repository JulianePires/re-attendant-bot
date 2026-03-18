"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { StatusAtendimento, TipoChamada } from "@/types";

const schemaPacienteId = z.string().cuid("ID de paciente inválido");
const schemaAtendimentoId = z.string().cuid("ID de atendimento inválido");

export async function entrarNaFila(pacienteId: string) {
  try {
    const pacienteIdValidado = schemaPacienteId.parse(pacienteId);

    return await prisma.atendimento.create({
      data: {
        pacienteId: pacienteIdValidado,
        tipoChamada: TipoChamada.NORMAL,
        status: StatusAtendimento.AGUARDANDO,
      },
    });
  } catch (error) {
    console.error("[entrarNaFila]", error);
    throw new Error("Não foi possível entrar na fila.");
  }
}

export async function chamarUrgencia(pacienteId: string) {
  try {
    const pacienteIdValidado = schemaPacienteId.parse(pacienteId);

    return await prisma.atendimento.create({
      data: {
        pacienteId: pacienteIdValidado,
        tipoChamada: TipoChamada.URGENTE,
        status: StatusAtendimento.AGUARDANDO,
      },
    });
  } catch (error) {
    console.error("[chamarUrgencia]", error);
    throw new Error("Não foi possível registrar a urgência.");
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
    return await prisma.atendimento.findMany({
      where: { status: StatusAtendimento.AGUARDANDO },
      orderBy: { criadoEm: "asc" },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[obterFilaAtiva]", error);
    throw new Error("Não foi possível carregar a fila ativa.");
  }
}

export async function obterAtendimentosDoDia() {
  try {
    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);

    const fimDoDia = new Date();
    fimDoDia.setHours(23, 59, 59, 999);

    return await prisma.atendimento.findMany({
      where: {
        status: StatusAtendimento.FINALIZADO,
        finalizadoEm: {
          gte: inicioDoDia,
          lte: fimDoDia,
        },
      },
      orderBy: { finalizadoEm: "desc" },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[obterAtendimentosDoDia]", error);
    throw new Error("Não foi possível carregar os atendimentos do dia.");
  }
}
