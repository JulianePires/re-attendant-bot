"use server";

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Server Actions para gerenciamento de usuários
 *
 * ATUALIZADO: Validação de permissões com auth.api.getSession()
 */

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

/**
 * Atualiza dados completos de um usuário (nome, email, role)
 * Requer permissão de admin
 */
export async function atualizarUsuarioAdmin({
  userId,
  data,
}: {
  userId: string;
  data: {
    name?: string;
    email?: string;
    role?: string;
  };
}) {
  // Validar sessão e permissão
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const userRole = (session.user.role || "").toLowerCase();
  if (userRole !== "admin") {
    throw new Error("Apenas administradores podem editar usuários.");
  }

  // Não deixar usuário alterar a própria role
  if (userId === session.user.id && data.role && data.role !== session.user.role) {
    throw new Error("Você não pode alterar sua própria permissão.");
  }

  // Validar email único (se estiver sendo alterado)
  if (data.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new Error("Este e-mail já está em uso por outro usuário.");
    }
  }

  // Atualizar usuário
  return await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.email && { email: data.email }),
      ...(data.role && { role: data.role }),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cpf: true,
    },
  });
}

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
