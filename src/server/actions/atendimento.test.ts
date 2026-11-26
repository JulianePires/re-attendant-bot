import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { atendimentoCreate, userFindMany, notificacaoCreateMany } = vi.hoisted(() => ({
  atendimentoCreate: vi.fn(),
  userFindMany: vi.fn(),
  notificacaoCreateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atendimento: { create: atendimentoCreate },
    user: { findMany: userFindMany },
    notificacao: { createMany: notificacaoCreateMany },
  },
}));

import { registrarEEntrarNaFila } from "./atendimento";

const profissionais = [{ id: "prof-1" }, { id: "prof-2" }];

function notificacoes(titulo: string, mensagem: string, tipo: "URGENTE" | "NORMAL") {
  return {
    data: profissionais.map((p) => ({ usuarioId: p.id, titulo, mensagem, tipo })),
  };
}

describe("registrarEEntrarNaFila", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    atendimentoCreate.mockImplementation(async ({ data }) => ({ id: "at-1", ...data }));
    userFindMany.mockResolvedValue(profissionais);
    notificacaoCreateMany.mockResolvedValue({ count: 2 });
  });

  describe("Totem atual sem mudança na urgência", () => {
    it("cria o atendimento urgente e notifica a equipe com o texto atual", async () => {
      await registrarEEntrarNaFila({ nome: "Carlos Lima", tipoChamada: "urgente" });

      expect(atendimentoCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ nomePaciente: "Carlos Lima", tipoChamada: "urgente" }),
      });
      expect(notificacaoCreateMany).toHaveBeenCalledWith(
        notificacoes("Paciente urgente na fila", "Novo Paciente: Carlos Lima", "URGENTE")
      );
    });

    it("notifica chamada normal com título e tipo normais", async () => {
      await registrarEEntrarNaFila({ nome: "Ana", tipoChamada: "normal" });

      expect(notificacaoCreateMany).toHaveBeenCalledWith(
        notificacoes("Novo paciente na fila", "Novo Paciente: Ana", "NORMAL")
      );
    });
  });

  describe("Totem atual continua funcionando com o CRM fora do ar", () => {
    it("cria o atendimento sem chamar o CRM quando o fetch falha", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
      vi.stubGlobal("fetch", fetchMock);

      await registrarEEntrarNaFila({ nome: "Carlos Lima", tipoChamada: "normal" });

      expect(atendimentoCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ nomePaciente: "Carlos Lima", tipoChamada: "normal" }),
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("Paciente sem agendamento chama um profissional", () => {
    it("cria atendimento urgente sem sufixo no nome e notifica com a indicação de sem agendamento", async () => {
      await registrarEEntrarNaFila({
        nome: "João Pereira",
        tipoChamada: "urgente",
        semAgendamento: true,
      });

      expect(atendimentoCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ nomePaciente: "João Pereira", tipoChamada: "urgente" }),
      });
      expect(notificacaoCreateMany).toHaveBeenCalledWith(
        notificacoes(
          "Sem agendamento: falar com um profissional",
          "Sem agendamento: João Pereira quer falar com um profissional",
          "URGENTE"
        )
      );
    });
  });

  describe("Sem agendamento com chamada normal", () => {
    it("keeps tipo NORMAL while using the sem-agendamento text when tipoChamada is normal", async () => {
      await registrarEEntrarNaFila({ nome: "Ana", tipoChamada: "normal", semAgendamento: true });

      expect(notificacaoCreateMany).toHaveBeenCalledWith(
        notificacoes(
          "Sem agendamento: falar com um profissional",
          "Sem agendamento: Ana quer falar com um profissional",
          "NORMAL"
        )
      );
    });
  });

  describe("validação do nome", () => {
    it("lança erro e não grava quando o nome tem menos de 2 caracteres", async () => {
      await expect(registrarEEntrarNaFila({ nome: " A ", tipoChamada: "urgente" })).rejects.toThrow(
        "Não foi possível registrar o atendimento."
      );

      expect(atendimentoCreate).not.toHaveBeenCalled();
      expect(notificacaoCreateMany).not.toHaveBeenCalled();
    });
  });
});
