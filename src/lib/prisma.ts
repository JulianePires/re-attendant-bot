import { PrismaClient } from "@prisma/client";

// ================================================================
// SINGLETON DO PRISMA CLIENT
// Em desenvolvimento com hot-reload (Next.js), novos módulos são
// avaliados a cada mudança, o que criaria múltiplas instâncias do
// PrismaClient e esgotaria o pool de conexões do banco.
// A solução padrão é armazenar a instância no objeto global,
// que sobrevive ao hot-reload.
// ================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
