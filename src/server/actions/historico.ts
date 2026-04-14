"use server";

import { prisma } from "@/lib/prisma";
import { StatusAtendimento } from "@/types";
import { startOfDay, endOfDay } from "date-fns";

/**
 * Busca atendimentos finalizados em uma data específica
 *
 * ATUALIZADO: Removido include do paciente (não existe mais a FK)
 * Agora usa nomePaciente diretamente do modelo Atendimento
 */
export async function obterHistoricoDoDia(data: string) {
  try {
    // Para evitar conflitos de fuso horário, utilizamos date-fns focando no dia exato
    const dataAlvo = new Date(data);
    const dataInicial = startOfDay(dataAlvo); // início do dia (00:00:00)
    const dataFinal = endOfDay(dataAlvo); // fim do dia (23:59:59)

    const atendimentos = await prisma.atendimento.findMany({
      where: {
        status: StatusAtendimento.FINALIZADO,
        finalizadoEm: {
          gte: dataInicial,
          lte: dataFinal,
        },
      },
      orderBy: {
        finalizadoEm: "desc",
      },
      select: {
        id: true,
        nomePaciente: true,
        criadoEm: true,
        finalizadoEm: true,
        tipoChamada: true,
        status: true,
      },
    });

    return atendimentos;
  } catch (error) {
    console.error("[obterHistoricoDoDia]", error);
    throw new Error("Falha ao carregar histórico");
  }
}
