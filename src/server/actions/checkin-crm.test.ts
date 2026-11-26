import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  respostaPacienteNaoEncontrado,
  respostaSucesso,
  respostaTokenInvalido,
} from "@/lib/crm/__fixtures__/localizar";
import { MENSAGEM_ERRO_TECNICO, MENSAGEM_TELEFONE_INVALIDO } from "@/lib/crm/mensagens";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import {
  NOME_COOKIE_ACESSO,
  VALIDADE_ACESSO_SEGUNDOS,
  gerarAutorizacao,
  validarAutorizacao,
} from "@/lib/crm/acesso";
import { limitadorBuscas } from "@/lib/crm/limitador";
import { MENSAGEM_CHAVE_INVALIDA } from "@/lib/crm/mensagens";
import { ativarTotemCheckin, localizarAgendamentoCheckin } from "./checkin-crm";

const URL_BASE = "https://crm.exemplo.test/functions/v1";
const CHAVE = "chave-de-teste";
const CHAVE_ACESSO = "chave-de-acesso-de-teste-com-32-caracteres-ou-mais";
const OUTRA_CHAVE_ACESSO = "outra-chave-de-acesso-de-teste-com-32-caracteres";

const fetchMock = vi.fn();
const cookieGet = vi.fn();
const cookieSet = vi.fn();

function definirCookieAcesso(valor: string | undefined) {
  cookieGet.mockImplementation((nome: string) =>
    nome === NOME_COOKIE_ACESSO && valor !== undefined ? { name: nome, value: valor } : undefined
  );
}

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
  vi.stubEnv("CRM_CHECKIN_ACCESS_KEY", CHAVE_ACESSO);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  configurarAmbienteLigado();
  cookieGet.mockReset();
  cookieSet.mockReset();
  vi.mocked(cookies).mockResolvedValue({ get: cookieGet, set: cookieSet } as never);
  definirCookieAcesso(gerarAutorizacao(CHAVE_ACESSO, "dispositivo-1"));
  limitadorBuscas.reiniciar();
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

  describe("Cenário: Busca chamada diretamente sem autorização", () => {
    it.each([
      ["sem cookie", () => undefined],
      ["cookie adulterado", () => `${gerarAutorizacao(CHAVE_ACESSO, "dispositivo-1")}x`],
      ["cookie lixo", () => "valor-qualquer"],
      ["cookie de outra chave", () => gerarAutorizacao(OUTRA_CHAVE_ACESSO, "dispositivo-1")],
    ])("returns indisponivel without calling the CRM with %s", async (_rotulo, valor) => {
      definirCookieAcesso(valor());

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({ tipo: "indisponivel", mensagem: MENSAGEM_ERRO_TECNICO });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("Cenário: Limite de buscas por minuto", () => {
    it("returns indisponivel without calling the CRM on the 11th search of the same device", async () => {
      fetchMock.mockImplementation(async () => respostaHttp(respostaSucesso));

      for (let i = 0; i < 10; i++) {
        const ok = await localizarAgendamentoCheckin("11987654321");
        expect(ok.tipo).toBe("encontrado");
      }
      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({ tipo: "indisponivel", mensagem: MENSAGEM_ERRO_TECNICO });
      expect(fetchMock).toHaveBeenCalledTimes(10);
    });

    it("still allows another device after the first one hit the limit", async () => {
      fetchMock.mockImplementation(async () => respostaHttp(respostaSucesso));
      for (let i = 0; i < 11; i++) await localizarAgendamentoCheckin("11987654321");
      definirCookieAcesso(gerarAutorizacao(CHAVE_ACESSO, "dispositivo-2"));

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado.tipo).toBe("encontrado");
    });

    it("does not consume the limit when the phone is invalid", async () => {
      fetchMock.mockImplementation(async () => respostaHttp(respostaSucesso));
      for (let i = 0; i < 15; i++) {
        const invalido = await localizarAgendamentoCheckin("123");
        expect(invalido.tipo).toBe("telefone_invalido");
      }

      for (let i = 0; i < 10; i++) {
        const ok = await localizarAgendamentoCheckin("11987654321");
        expect(ok.tipo).toBe("encontrado");
      }
    });
  });
});

describe("ativarTotemCheckin", () => {
  describe("Cenário: Ativação com a chave certa", () => {
    it("sets the authorization cookie with restrictive options and returns ok", async () => {
      const resultado = await ativarTotemCheckin(CHAVE_ACESSO);

      expect(resultado).toEqual({ ok: true });
      expect(cookieSet).toHaveBeenCalledTimes(1);
      const [nome, valor, opcoes] = cookieSet.mock.calls[0];
      expect(nome).toBe("totem_crm_acesso");
      expect(typeof valor).toBe("string");
      expect(opcoes).toEqual({
        httpOnly: true,
        sameSite: "lax",
        path: "/recepcao-crm",
        maxAge: VALIDADE_ACESSO_SEGUNDOS,
        secure: false,
      });
    });

    it("marks the cookie as secure in production", async () => {
      vi.stubEnv("NODE_ENV", "production");

      await ativarTotemCheckin(CHAVE_ACESSO);

      expect(cookieSet.mock.calls[0][2].secure).toBe(true);
    });

    it("stores a value that does not contain the access key and is accepted by validarAutorizacao", async () => {
      await ativarTotemCheckin(CHAVE_ACESSO);

      const valor = cookieSet.mock.calls[0][1] as string;
      expect(valor).not.toContain(CHAVE_ACESSO);
      expect(validarAutorizacao(valor, CHAVE_ACESSO)).not.toBeNull();
    });
  });

  describe("Cenário: Ativação com chave inválida", () => {
    it.each([
      ["chave errada", "chave-errada-chave-errada-chave-errada-xx"],
      ["chave vazia", ""],
      ["undefined", undefined],
      ["null", null],
      ["número", 123],
      ["objeto", {}],
    ])("returns invalid-key message and sets no cookie for %s", async (_rotulo, entrada) => {
      const resultado = await ativarTotemCheckin(entrada as unknown as string);

      expect(resultado).toEqual({ ok: false, mensagem: MENSAGEM_CHAVE_INVALIDA });
      expect(resultado).toMatchObject({ mensagem: "Chave de acesso inválida." });
      expect(cookieSet).not.toHaveBeenCalled();
    });
  });

  describe("Cenário: Totem desligado ou chave de acesso não configurada", () => {
    it.each([
      ["flag false", () => vi.stubEnv("CRM_CHECKIN_ENABLED", "false")],
      ["flag ausente", () => vi.stubEnv("CRM_CHECKIN_ENABLED", "")],
      ["chave de acesso ausente", () => vi.stubEnv("CRM_CHECKIN_ACCESS_KEY", "")],
      [
        "chave de acesso com 31 caracteres",
        () => vi.stubEnv("CRM_CHECKIN_ACCESS_KEY", "a".repeat(31)),
      ],
    ])("returns technical message and sets no cookie when %s", async (_rotulo, configurar) => {
      configurar();

      const resultado = await ativarTotemCheckin(CHAVE_ACESSO);

      expect(resultado).toEqual({ ok: false, mensagem: MENSAGEM_ERRO_TECNICO });
      expect(cookieSet).not.toHaveBeenCalled();
    });

    it("accepts an access key of exactly 32 characters", async () => {
      const chave32 = "a".repeat(32);
      vi.stubEnv("CRM_CHECKIN_ACCESS_KEY", chave32);

      const resultado = await ativarTotemCheckin(chave32);

      expect(resultado).toEqual({ ok: true });
    });
  });
});

describe("ativarTotemCheckin - bordas e ciclo completo", () => {
  it("rejects an access key longer than 256 characters without setting the cookie", async () => {
    const resultado = await ativarTotemCheckin(CHAVE_ACESSO + "x".repeat(257));

    expect(resultado).toEqual({ ok: false, mensagem: MENSAGEM_CHAVE_INVALIDA });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("the cookie issued by ativarTotemCheckin is accepted by localizarAgendamentoCheckin", async () => {
    cookieGet.mockReset();
    definirCookieAcesso(undefined);
    fetchMock.mockImplementation(async () => respostaHttp(respostaSucesso));
    await ativarTotemCheckin(CHAVE_ACESSO);
    const valorEmitido = cookieSet.mock.calls[0][1] as string;
    definirCookieAcesso(valorEmitido);

    const resultado = await localizarAgendamentoCheckin("11987654321");

    expect(resultado.tipo).toBe("encontrado");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not log the access key", async () => {
    const espioes = (["log", "info", "warn", "error"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {})
    );
    fetchMock.mockImplementation(async () => respostaHttp(respostaSucesso));

    await ativarTotemCheckin(CHAVE_ACESSO);
    await ativarTotemCheckin("chave-errada-chave-errada-chave-errada-xx");
    await localizarAgendamentoCheckin("11987654321");

    const registrado = espioes.flatMap((e) => e.mock.calls).map((args) => JSON.stringify(args));
    espioes.forEach((e) => e.mockRestore());
    expect(registrado.filter((linha) => linha.includes(CHAVE_ACESSO))).toEqual([]);
  });
});
