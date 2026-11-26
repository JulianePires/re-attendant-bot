import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  respostaPacienteNaoEncontrado,
  respostaSucesso,
  respostaTokenInvalido,
} from "@/lib/crm/__fixtures__/localizar";
import { MENSAGEM_ERRO_TECNICO, MENSAGEM_TELEFONE_INVALIDO } from "@/lib/crm/mensagens";

vi.mock("server-only", () => ({}));

import { localizarAgendamentoCheckin } from "./checkin-crm";

const URL_BASE = "https://crm.exemplo.test/functions/v1";
const CHAVE = "chave-de-teste";

const fetchMock = vi.fn();

function respostaHttp({ status, corpo }: { status: number; corpo: unknown }) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function configurarAmbienteLigado() {
  vi.stubEnv("CRM_CHECKIN_ENABLED", "true");
  vi.stubEnv("CRM_BASE_URL", URL_BASE);
  vi.stubEnv("CRM_API_KEY", CHAVE);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  configurarAmbienteLigado();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("localizarAgendamentoCheckin", () => {
  describe("Cenário: Paciente encontra o agendamento de agora", () => {
    it("returns only first name, time and professional when CRM finds the appointment", async () => {
      fetchMock.mockResolvedValue(respostaHttp(respostaSucesso));

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({
        tipo: "encontrado",
        agendamento: {
          primeiroNome: "Maria",
          hora: "14:00",
          profissional: "Ana Lima",
        },
      });
    });

    it("calls the CRM once with POST, api key header and phone body", async () => {
      fetchMock.mockResolvedValue(respostaHttp(respostaSucesso));

      await localizarAgendamentoCheckin("11987654321");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe(`${URL_BASE}/agenda/localizar`);
      expect(init.method).toBe("POST");
      expect(new Headers(init.headers).get("x-api-key")).toBe(CHAVE);
      expect(JSON.parse(init.body)).toEqual({ telefone: "11987654321" });
    });

    it("does not leak consulta_id, procedure, full name or api key to the client (RNF-001.1, RNF-001.3)", async () => {
      fetchMock.mockResolvedValue(respostaHttp(respostaSucesso));

      const resultado = await localizarAgendamentoCheckin("11987654321");
      const serializado = JSON.stringify(resultado);

      expect(serializado).not.toContain(respostaSucesso.corpo.consulta_id);
      expect(serializado).not.toContain("Pilates");
      expect(serializado).not.toContain("Maria Souza");
      expect(serializado).not.toContain(CHAVE);
    });
  });

  describe("Cenário: Formatos de telefone aceitos", () => {
    it.each([
      ["5511987654321", "5511987654321"],
      ["(11) 98765-4321", "11987654321"],
      ["1132654321", "1132654321"],
    ])("sends %s to the CRM as %s", async (entrada, enviado) => {
      fetchMock.mockResolvedValue(respostaHttp(respostaSucesso));

      await localizarAgendamentoCheckin(entrada);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        telefone: enviado,
      });
    });
  });

  describe("Cenário: Telefone com menos de 10 dígitos", () => {
    it("returns telefone_invalido without calling the CRM when phone has 9 digits", async () => {
      const resultado = await localizarAgendamentoCheckin("119876543");

      expect(resultado).toEqual({
        tipo: "telefone_invalido",
        mensagem: MENSAGEM_TELEFONE_INVALIDO,
      });
      expect(resultado).toMatchObject({ mensagem: "Digite o telefone com DDD." });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("Borda: entrada fora do tipo ou grande demais", () => {
    it.each([
      ["undefined", undefined],
      ["null", null],
      ["a number", 123],
      ["an object", {}],
      ["a 21+ character string", "1".repeat(21)],
    ])(
      "returns telefone_invalido without throwing for non-string or oversized input (%s)",
      async (_rotulo, entrada) => {
        const resultado = await localizarAgendamentoCheckin(entrada as unknown as string);

        expect(resultado).toEqual({
          tipo: "telefone_invalido",
          mensagem: "Digite o telefone com DDD.",
        });
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );
  });

  describe("Cenário: Totem de teste desligado", () => {
    it.each([
      ["false", "false"],
      ["ausente", undefined],
    ])(
      "returns indisponivel without calling the CRM when CRM_CHECKIN_ENABLED is %s",
      async (_rotulo, valor) => {
        if (valor === undefined) vi.stubEnv("CRM_CHECKIN_ENABLED", "");
        else vi.stubEnv("CRM_CHECKIN_ENABLED", valor);

        const resultado = await localizarAgendamentoCheckin("11987654321");

        expect(resultado).toEqual({
          tipo: "indisponivel",
          mensagem: MENSAGEM_ERRO_TECNICO,
        });
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );
  });

  describe("Configuração ausente", () => {
    it.each([
      ["CRM_API_KEY", CHAVE],
      ["CRM_BASE_URL", URL_BASE],
    ])("returns indisponivel without calling the CRM when %s is empty", async (variavel) => {
      vi.stubEnv(variavel, "");

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({
        tipo: "indisponivel",
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("Provisório deste card: qualquer falha vira indisponivel", () => {
    it("returns indisponivel with technical message on business error from the CRM", async () => {
      fetchMock.mockResolvedValue(respostaHttp(respostaPacienteNaoEncontrado));

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({
        tipo: "indisponivel",
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
    });

    it("returns indisponivel with technical message on HTTP 401", async () => {
      fetchMock.mockResolvedValue(respostaHttp(respostaTokenInvalido));

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({
        tipo: "indisponivel",
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
    });

    it("returns indisponivel with technical message when the network fails", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({
        tipo: "indisponivel",
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
    });
  });
});
