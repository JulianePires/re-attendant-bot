import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  atendimentoFindUnique,
  atendimentoCreate,
  userFindMany,
  notificacaoCreateMany,
  transaction,
} = vi.hoisted(() => {
  const atendimentoCreate = vi.fn();
  const userFindMany = vi.fn();
  const notificacaoCreateMany = vi.fn();
  const tx = {
    atendimento: { create: atendimentoCreate },
    user: { findMany: userFindMany },
    notificacao: { createMany: notificacaoCreateMany },
  };
  return {
    atendimentoFindUnique: vi.fn(),
    atendimentoCreate,
    userFindMany,
    notificacaoCreateMany,
    transaction: vi.fn(async (fn: (cliente: typeof tx) => Promise<unknown>) => fn(tx)),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atendimento: { findUnique: atendimentoFindUnique },
    $transaction: transaction,
  },
}));

import { entrarNaFilaPorConsulta, hashConsulta } from "./fila";

const CONSULTA_ID = "3f1c2b9a-6d4e-4f8a-9b7c-2e5d1a0f8c34";
const HASH_ESPERADO = createHash("sha256").update(CONSULTA_ID).digest("hex");
const profissionais = [{ id: "prof-1" }, { id: "prof-2" }];

describe("hashConsulta", () => {
  it("devolve o SHA-256 em hexadecimal com 64 caracteres", () => {
    expect(hashConsulta(CONSULTA_ID)).toBe(HASH_ESPERADO);
    expect(hashConsulta(CONSULTA_ID)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("devolve sempre o mesmo valor para o mesmo id", () => {
    expect(hashConsulta(CONSULTA_ID)).toBe(hashConsulta(CONSULTA_ID));
  });

  it("devolve valores diferentes para ids diferentes", () => {
    expect(hashConsulta(CONSULTA_ID)).not.toBe(hashConsulta("outra-consulta"));
  });

  it("não devolve o id puro", () => {
    expect(hashConsulta(CONSULTA_ID)).not.toContain(CONSULTA_ID);
  });
});

describe("entrarNaFilaPorConsulta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    atendimentoFindUnique.mockResolvedValue(null);
    atendimentoCreate.mockImplementation(async ({ data }) => ({ id: "at-1", ...data }));
    userFindMany.mockResolvedValue(profissionais);
    notificacaoCreateMany.mockResolvedValue({ count: 2 });
  });

  describe("Chegada confirmada coloca a paciente na fila", () => {
    it("grava o nome sem espaços, normal, aguardando e com o hash da consulta", async () => {
      const resultado = await entrarNaFilaPorConsulta({
        nome: "  Maria Souza  ",
        consultaId: CONSULTA_ID,
      });

      expect(resultado).toBe("criado");
      expect(atendimentoFindUnique).toHaveBeenCalledWith({
        where: { consultaHash: HASH_ESPERADO },
      });
      expect(atendimentoCreate).toHaveBeenCalledWith({
        data: {
          nomePaciente: "Maria Souza",
          tipoChamada: "normal",
          status: "aguardando",
          consultaHash: HASH_ESPERADO,
        },
      });
    });

    it("não grava o id puro da consulta em nenhum dado", async () => {
      await entrarNaFilaPorConsulta({ nome: "Maria Souza", consultaId: CONSULTA_ID });

      const gravado = JSON.stringify([
        atendimentoFindUnique.mock.calls,
        atendimentoCreate.mock.calls,
        notificacaoCreateMany.mock.calls,
      ]);
      expect(gravado).not.toContain(CONSULTA_ID);
    });

    it("notifica a equipe com 'Novo paciente na fila' e 'Novo Paciente: Maria Souza'", async () => {
      await entrarNaFilaPorConsulta({ nome: "  Maria Souza  ", consultaId: CONSULTA_ID });

      expect(userFindMany).toHaveBeenCalledWith({
        where: { role: { in: ["profissional", "admin"] } },
        select: { id: true },
      });
      expect(notificacaoCreateMany).toHaveBeenCalledWith({
        data: profissionais.map((p) => ({
          usuarioId: p.id,
          titulo: "Novo paciente na fila",
          mensagem: "Novo Paciente: Maria Souza",
          tipo: "NORMAL",
        })),
      });
    });
  });

  describe("Confirmação repetida não duplica a fila", () => {
    it("devolve 'existente' sem transação, sem criar e sem notificar", async () => {
      atendimentoFindUnique.mockResolvedValue({ id: "at-1" });

      const resultado = await entrarNaFilaPorConsulta({
        nome: "Maria Souza",
        consultaId: CONSULTA_ID,
      });

      expect(resultado).toBe("existente");
      expect(transaction).not.toHaveBeenCalled();
      expect(atendimentoCreate).not.toHaveBeenCalled();
      expect(notificacaoCreateMany).not.toHaveBeenCalled();
    });
  });

  describe("Duas confirmações ao mesmo tempo", () => {
    it("devolve 'existente' sem notificar quando o banco recusa por unicidade (P2002)", async () => {
      atendimentoCreate.mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));

      const resultado = await entrarNaFilaPorConsulta({
        nome: "Maria Souza",
        consultaId: CONSULTA_ID,
      });

      expect(resultado).toBe("existente");
      expect(notificacaoCreateMany).not.toHaveBeenCalled();
    });
  });

  describe("Falha na fila depois do CRM confirmar", () => {
    it("relança erro sem P2002 e não notifica", async () => {
      const falha = Object.assign(new Error("connection lost"), { code: "P1001" });
      atendimentoCreate.mockRejectedValue(falha);

      await expect(
        entrarNaFilaPorConsulta({ nome: "Maria Souza", consultaId: CONSULTA_ID })
      ).rejects.toBe(falha);

      expect(notificacaoCreateMany).not.toHaveBeenCalled();
    });

    it("relança a falha ao notificar a equipe e não devolve 'criado'", async () => {
      const falha = new Error("notificacao fora do ar");
      notificacaoCreateMany.mockRejectedValue(falha);

      await expect(
        entrarNaFilaPorConsulta({ nome: "Maria Souza", consultaId: CONSULTA_ID })
      ).rejects.toBe(falha);
    });

    it("relança erro sem código e não notifica", async () => {
      const falha = new Error("boom");
      atendimentoCreate.mockRejectedValue(falha);

      await expect(
        entrarNaFilaPorConsulta({ nome: "Maria Souza", consultaId: CONSULTA_ID })
      ).rejects.toBe(falha);

      expect(notificacaoCreateMany).not.toHaveBeenCalled();
    });
  });
});
