"use server";

import { prisma } from "@/lib/prisma";
import { patientQueueSchema } from "@/lib/validations/schemas";
import { StatusAtendimento, TipoChamada, TipoChamadaValue } from "@/types";
import { z } from "zod";
import { getSession } from "@/lib/auth-client";

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

const schemaPacienteId = z.string().cuid("ID de paciente inválido");
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

const schemaAtendimentoNaFila = z.object({
  id: z.string(),
  pacienteId: z.string(),
  paciente: z.object({
    id: z.string(),
    name: z.string(),
  }),
  tipoChamada: z.enum([TipoChamada.NORMAL, TipoChamada.URGENTE]),
  status: z.enum([StatusAtendimento.AGUARDANDO, StatusAtendimento.FINALIZADO]),
  criadoEm: z.date(),
  finalizadoEm: z.date().nullable(),
});

export async function entrarNaFila(pacienteId: string) {
  try {
    const pacienteIdValidado = schemaPacienteId.parse(pacienteId);

    const atendimento = await prisma.atendimento.create({
      data: {
        pacienteId: pacienteIdValidado,
        tipoChamada: TipoChamada.NORMAL,
        status: StatusAtendimento.AGUARDANDO,
      },
      include: {
        paciente: {
          select: {
            name: true,
          },
        },
      },
    });

    await criarNotificacoesParaEquipe({
      nomePaciente: atendimento.paciente.name,
      tipoChamada: atendimento.tipoChamada as TipoChamadaValue,
    });

    return atendimento;
  } catch (error) {
    console.error("[entrarNaFila]", error);
    throw new Error("Não foi possível entrar na fila.");
  }
}

export async function chamarUrgencia(pacienteId: string) {
  try {
    const pacienteIdValidado = schemaPacienteId.parse(pacienteId);

    const atendimento = await prisma.atendimento.create({
      data: {
        pacienteId: pacienteIdValidado,
        tipoChamada: TipoChamada.URGENTE,
        status: StatusAtendimento.AGUARDANDO,
      },
      include: {
        paciente: {
          select: {
            name: true,
          },
        },
      },
    });

    await criarNotificacoesParaEquipe({
      nomePaciente: atendimento.paciente.name,
      tipoChamada: atendimento.tipoChamada as TipoChamadaValue,
    });

    return atendimento;
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
    const atendimentos = await prisma.atendimento.findMany({
      where: { status: StatusAtendimento.AGUARDANDO },
      orderBy: [{ tipoChamada: "desc" }, { criadoEm: "asc" }],
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
          },
        },
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
    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);

    const fimDoDia = new Date();
    fimDoDia.setHours(23, 59, 59, 999);

    const atendimentos = await prisma.atendimento.findMany({
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

    return atendimentos.map((item) => schemaAtendimentoNaFila.parse(item));
  } catch (error) {
    console.error("[obterAtendimentosDoDia]", error);
    throw new Error("Não foi possível carregar os atendimentos do dia.");
  }
}

export async function entrarNaFilaComValidacao(dados: z.infer<typeof patientQueueSchema>) {
  try {
    const dadosValidados = patientQueueSchema.parse(dados);

    let paciente = await prisma.user.findUnique({
      where: { cpf: dadosValidados.cpf },
    });

    if (!paciente) {
      paciente = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: dadosValidados.nome, // Map `nome` to `name`
          cpf: dadosValidados.cpf,
          email: `${dadosValidados.cpf}@paciente.local`, // Adjusted placeholder email
          emailVerified: false,
          role: "paciente",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return await prisma.atendimento.create({
      data: {
        pacienteId: paciente.id,
        tipoChamada: TipoChamada.NORMAL,
        status: StatusAtendimento.AGUARDANDO,
      },
    });
  } catch (error) {
    console.error("[entrarNaFilaComValidacao]", error);
    throw new Error("Não foi possível entrar na fila.");
  }
}

export async function buscarPacientePorCPF(cpf: string) {
  try {
    const paciente = await prisma.user.findUnique({
      where: { cpf: cpf.replace(/\D/g, "") },
      select: { id: true, name: true, cpf: true },
    });
    return paciente;
  } catch (error) {
    console.error("[buscarPacientePorCPF]", error);
    return null;
  }
}

export async function registrarEEntrarNaFila(dados: {
  nome: string;
  cpf: string;
  email?: string;
  tipoChamada: TipoChamadaValue;
}) {
  try {
    const cpfLimpo = dados.cpf.replace(/\D/g, "");
    let paciente = await prisma.user.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (!paciente) {
      // Se email for fornecido, usa; senão cria um placeholder
      const email = dados.email?.trim() || `${cpfLimpo}@paciente.local`;

      paciente = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: dados.nome,
          cpf: cpfLimpo,
          email: email,
          emailVerified: !!dados.email, // Marcar como verificado apenas se o usuário forneceu
          role: "paciente",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else if (dados.email && !paciente.email?.includes("@paciente.local")) {
      // Se paciente existe e forneceu email válido, atualizar se não tiver email real
      await prisma.user.update({
        where: { cpf: cpfLimpo },
        data: {
          email: dados.email,
          emailVerified: true,
        },
      });
    }

    const atendimento = await prisma.atendimento.create({
      data: {
        pacienteId: paciente.id,
        tipoChamada: dados.tipoChamada,
        status: StatusAtendimento.AGUARDANDO,
      },
    });

    await criarNotificacoesParaEquipe({
      nomePaciente: paciente.name,
      tipoChamada: dados.tipoChamada,
    });

    return atendimento;
  } catch (error) {
    console.error("[registrarEEntrarNaFila]", error);
    throw new Error("Não foi possível registrar o atendimento.");
  }
}

export async function obterResumoAtendimento(atendimentoId: string) {
  try {
    const session = await getSession();
    if (!session?.data?.user?.id) {
      return null;
    }

    const atendimentoIdValidado = schemaAtendimentoId.parse(atendimentoId);

    const atendimento = await prisma.atendimento.findUnique({
      where: { id: atendimentoIdValidado },
      select: {
        tipoChamada: true,
        paciente: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!atendimento) {
      return null;
    }

    return {
      nomePaciente: atendimento.paciente.name,
      tipoChamada: atendimento.tipoChamada as TipoChamadaValue,
    };
  } catch (error) {
    console.error("[obterResumoAtendimento]", error);
    return null;
  }
}
