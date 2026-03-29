"use server";

import { prisma } from "@/lib/prisma";
import { StatusAtendimento } from "@/types";
import { startOfDay, endOfDay } from "date-fns";

export async function obterHistoricoDoDia(data: string) {
  try {
    // Para evitar conflitos de fuso horário, utilizamos date-fns focando no dia exato
    const dataAlvo = new Date(data); // garantimos que seja no meio do dia para não ser jogado ao dia anterior pelo GMT
    const dataInicial = startOfDay(dataAlvo); // início do dia (00:00:00)
    const dataFinal = endOfDay(dataAlvo);

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
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
      },
    });

    return atendimentos;
  } catch (error) {
    console.error("[obterHistoricoDoDia]", error);
    throw new Error("Falha ao carregar histórico");
  }
}
