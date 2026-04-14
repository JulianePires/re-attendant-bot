"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Server Actions para Notificações
 *
 * CORRIGIDO: Usa auth.api.getSession() ao invés de getSession() do cliente
 */

type NotificacaoItem = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "URGENTE" | "NORMAL";
  lida: boolean;
  criadoEm: Date;
  usuarioId: string;
};

type PrismaWithNotificacao = typeof prisma & {
  notificacao: {
    findMany: (args: {
      where: { usuarioId: string };
      orderBy: { criadoEm: "desc" };
    }) => Promise<NotificacaoItem[]>;
    updateMany: (args: {
      where: { id?: string; usuarioId: string; lida: false };
      data: { lida: true };
    }) => Promise<{ count: number }>;
  };
};

const prismaWithNotificacao = prisma as PrismaWithNotificacao;

export async function obterNotificacoes() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  return prismaWithNotificacao.notificacao.findMany({
    where: {
      usuarioId: session.user.id,
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function marcarComoLida(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  const resultado = await prismaWithNotificacao.notificacao.updateMany({
    where: {
      id,
      usuarioId: session.user.id,
      lida: false,
    },
    data: {
      lida: true,
    },
  });

  if (resultado.count === 0) {
    throw new Error("Notificação não encontrada para este usuário.");
  }

  revalidatePath("/painel");

  return { sucesso: true };
}

export async function marcarTodasComoLidas() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  const resultado = await prismaWithNotificacao.notificacao.updateMany({
    where: {
      usuarioId: session.user.id,
      lida: false,
    },
    data: {
      lida: true,
    },
  });

  revalidatePath("/painel");

  return { atualizadas: resultado.count };
}
