"use server";

import { prisma } from "@/lib/prisma";

export async function obterUsuarios() {
  try {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("[obterUsuarios]", error);
    throw new Error("Nao foi possivel carregar os usuarios.");
  }
}

export async function listarProfissionais() {
  return await prisma.user.findMany({
    where: {
      role: {
        in: ["profissional", "admin"],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cpf: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function obterPacientes() {
  return await prisma.user.findMany({
    where: {
      role: "paciente",
    },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export const alterarPermissaoProfissional = async ({
  usuarioId,
  role,
  usuarioLogadoId,
}: {
  usuarioId: string;
  role: string;
  usuarioLogadoId: string;
}) => {
  if (usuarioId === usuarioLogadoId) {
    throw new Error("Você não pode alterar sua própria permissão aqui.");
  }

  return await prisma.user.update({
    where: { id: usuarioId },
    data: { role },
  });
};

export const removerUsuario = async ({
  usuarioId,
  usuarioLogadoId,
}: {
  usuarioId: string;
  usuarioLogadoId: string;
}) => {
  // Your logic to remove the professional
  if (usuarioId === usuarioLogadoId) {
    throw new Error("Você não pode remover a si mesmo.");
  }

  // Example Prisma deletion logic
  return await prisma.user.delete({
    where: { id: usuarioId },
  });
};
