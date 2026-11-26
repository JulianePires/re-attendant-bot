import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { respostaSucesso, respostaTokenInvalido } from "@/lib/crm/__fixtures__/localizar";
import { MENSAGEM_ERRO_TECNICO, MENSAGEM_TELEFONE_INVALIDO } from "@/lib/crm/mensagens";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import {
  gerarAutorizacao,
  NOME_COOKIE_ACESSO,
  VALIDADE_ACESSO_SEGUNDOS,
  validarAutorizacao,
} from "@/lib/crm/acesso";
import { limitadorBuscas } from "@/lib/crm/limitador";
import { MENSAGEM_CHAVE_INVALIDA } from "@/lib/crm/mensagens";
import {
  consultaIdLocalizada,
  respostaConfirmacaoDadosInvalidos,
  respostaConfirmacaoJaRegistrado,
  respostaConfirmacaoNaoEncontrada,
  respostaConfirmacaoSucesso,
  respostaConfirmacaoTokenInvalido,
} from "@/lib/crm/__fixtures__/confirmar";
import {
  ativarTotemCheckin,
  confirmarChegadaCheckin,
  localizarAgendamentoCheckin,
} from "./checkin-crm";

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
  vi.mocked(cookies).mockResolvedValue({
    get: cookieGet,
    set: cookieSet,
  } as never);
  definirCookieAcesso(gerarAutorizacao(CHAVE_ACESSO, "dispositivo-1"));
  limitadorBuscas.reiniciar();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
        comprovante: expect.any(String),
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
      expect(resultado).toMatchObject({
        mensagem: "Digite o telefone com DDD.",
      });
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

  describe("Erros técnicos continuam indisponivel", () => {
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

      expect(resultado).toEqual({
        tipo: "indisponivel",
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
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

      expect(resultado).toEqual({
        tipo: "indisponivel",
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
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

function corpoNegocio(motivo: string, mensagem?: string) {
  return respostaHttp({
    status: 200,
    corpo: mensagem === undefined ? { ok: false, motivo } : { ok: false, motivo, mensagem },
  });
}

function linhasLogLocalizar(espioes: { mock: { calls: unknown[][] } }[]) {
  return espioes
    .flatMap((e) => e.mock.calls)
    .map((args) => String(args[0]))
    .flatMap((linha) => {
      try {
        const json = JSON.parse(linha);
        return json && json.evento === "crm.localizar" ? [json] : [];
      } catch {
        return [];
      }
    });
}

describe("localizarAgendamentoCheckin - respostas de negócio do CRM", () => {
  describe("Cenário: Paciente não encontrado", () => {
    it("returns nao_encontrado with the CRM message and without the raw motivo", async () => {
      fetchMock.mockResolvedValue(
        corpoNegocio("paciente_nao_encontrado", "Não encontrei nenhum cadastro com esse número.")
      );

      const resultado = await localizarAgendamentoCheckin("11900000000");

      expect(resultado).toEqual({
        tipo: "nao_encontrado",
        mensagem: "Não encontrei nenhum cadastro com esse número.",
      });
      expect(JSON.stringify(resultado)).not.toContain("paciente_nao_encontrado");
    });
  });

  describe("Cenário: Consulta de hoje fora da janela de check-in", () => {
    it("returns fora_da_janela with the CRM message", async () => {
      fetchMock.mockResolvedValue(
        corpoNegocio("fora_da_janela", "Sua consulta é às 17:00. O check-in abre às 16:00.")
      );

      const resultado = await localizarAgendamentoCheckin("11911112222");

      expect(resultado).toEqual({
        tipo: "fora_da_janela",
        mensagem: "Sua consulta é às 17:00. O check-in abre às 16:00.",
      });
    });
  });

  describe("Cenário: Nenhum agendamento para agora", () => {
    it("returns sem_agendamento with the CRM message and without the raw motivo", async () => {
      fetchMock.mockResolvedValue(
        corpoNegocio("sem_agendamento_agora", "Não encontrei agendamento para agora.")
      );

      const resultado = await localizarAgendamentoCheckin("11933334444");

      expect(resultado).toEqual({
        tipo: "sem_agendamento",
        mensagem: "Não encontrei agendamento para agora.",
      });
      expect(JSON.stringify(resultado)).not.toContain("sem_agendamento_agora");
    });
  });

  describe("Cenário: Chegada já registrada na localização", () => {
    it("returns chegada_ja_registrada with the CRM message and without the raw motivo", async () => {
      fetchMock.mockResolvedValue(corpoNegocio("ja_registrado", "Sua chegada já foi registrada."));

      const resultado = await localizarAgendamentoCheckin("11955556666");

      expect(resultado).toEqual({
        tipo: "chegada_ja_registrada",
        mensagem: "Sua chegada já foi registrada.",
      });
      expect(JSON.stringify(resultado)).not.toContain("ja_registrado");
    });
  });

  describe("Cenário: Motivo conhecido sem mensagem", () => {
    it.each([
      [
        "paciente_nao_encontrado",
        "nao_encontrado",
        "Não encontrei nenhum cadastro com esse número.",
      ],
      [
        "fora_da_janela",
        "fora_da_janela",
        "Sua consulta de hoje ainda não está no horário de check-in. Por favor, procure a recepção.",
      ],
      ["sem_agendamento_agora", "sem_agendamento", "Não encontrei agendamento para agora."],
      [
        "ja_registrado",
        "chegada_ja_registrada",
        "Sua chegada já estava registrada. Aguarde, você será chamado(a) em breve.",
      ],
      ["telefone_invalido", "telefone_invalido", "Digite o telefone com DDD."],
    ])("uses the default text for %s without message", async (motivo, tipo, padrao) => {
      fetchMock.mockResolvedValue(corpoNegocio(motivo));

      const resultado = await localizarAgendamentoCheckin("11977778888");

      expect(resultado).toEqual({ tipo, mensagem: padrao });
    });

    it.each([
      [
        "paciente_nao_encontrado",
        "nao_encontrado",
        "Não encontrei nenhum cadastro com esse número.",
      ],
      ["sem_agendamento_agora", "sem_agendamento", "Não encontrei agendamento para agora."],
    ])("uses the default text for %s when message is blank", async (motivo, tipo, padrao) => {
      fetchMock.mockResolvedValue(corpoNegocio(motivo, "   "));

      const resultado = await localizarAgendamentoCheckin("11977778888");

      expect(resultado).toEqual({ tipo, mensagem: padrao });
    });

    it("trims the CRM message when it has surrounding spaces", async () => {
      fetchMock.mockResolvedValue(corpoNegocio("sem_agendamento_agora", "  Sem horário agora.  "));

      const resultado = await localizarAgendamentoCheckin("11977778888");

      expect(resultado).toEqual({
        tipo: "sem_agendamento",
        mensagem: "Sem horário agora.",
      });
    });
  });

  describe("Cenário: Motivo fora da tabela", () => {
    it("returns impedimento with the CRM message when dados_invalidos has a message", async () => {
      fetchMock.mockResolvedValue(
        corpoNegocio("dados_invalidos", "Faltou alguma informação para eu concluir.")
      );

      const resultado = await localizarAgendamentoCheckin("11977778888");

      expect(resultado).toEqual({
        tipo: "impedimento",
        mensagem: "Faltou alguma informação para eu concluir.",
      });
      expect(JSON.stringify(resultado)).not.toContain("dados_invalidos");
    });

    it.each([
      ["sem mensagem", undefined],
      ["mensagem em branco", "   "],
    ])("returns impedimento with the default text when dados_invalidos has %s", async (_r, msg) => {
      fetchMock.mockResolvedValue(corpoNegocio("dados_invalidos", msg));

      const resultado = await localizarAgendamentoCheckin("11977778888");

      expect(resultado).toEqual({
        tipo: "impedimento",
        mensagem: "Não foi possível continuar seu check-in. Por favor, procure a recepção.",
      });
      expect(JSON.stringify(resultado)).not.toContain("dados_invalidos");
    });

    it("logs the unknown motivo with console.warn, desconhecido true and without the phone", async () => {
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      fetchMock.mockResolvedValue(corpoNegocio("dados_invalidos"));

      await localizarAgendamentoCheckin("11977778888");

      const linhasWarn = linhasLogLocalizar([warn]);
      const todas = [...info.mock.calls, ...warn.mock.calls].map((a) => JSON.stringify(a));
      expect(linhasWarn).toHaveLength(1);
      expect(linhasWarn[0]).toMatchObject({
        evento: "crm.localizar",
        motivo: "dados_invalidos",
        desconhecido: true,
      });
      expect(typeof linhasWarn[0].categoria).toBe("string");
      expect(typeof linhasWarn[0].duracaoMs).toBe("number");
      expect(todas.filter((l) => l.includes("11977778888"))).toEqual([]);
    });
  });

  describe("Log técnico de motivo conhecido", () => {
    it("logs a known motivo with console.info, desconhecido false and without the phone", async () => {
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      fetchMock.mockResolvedValue(corpoNegocio("paciente_nao_encontrado", "Não achei."));

      await localizarAgendamentoCheckin("11977778888");

      const linhasInfo = linhasLogLocalizar([info]);
      const todas = [...info.mock.calls, ...warn.mock.calls].map((a) => JSON.stringify(a));
      const avisos = warn.mock.calls.length;
      expect(linhasInfo).toHaveLength(1);
      expect(linhasInfo[0]).toMatchObject({
        evento: "crm.localizar",
        motivo: "paciente_nao_encontrado",
        desconhecido: false,
      });
      expect(typeof linhasInfo[0].duracaoMs).toBe("number");
      expect(avisos).toBe(0);
      expect(todas.filter((l) => l.includes("11977778888"))).toEqual([]);
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

      expect(resultado).toEqual({
        ok: false,
        mensagem: MENSAGEM_CHAVE_INVALIDA,
      });
      expect(resultado).toMatchObject({
        mensagem: "Chave de acesso inválida.",
      });
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

      expect(resultado).toEqual({
        ok: false,
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
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
    expect(registrado.filter((linha) => linha.includes(CHAVE_ACESSO))).toEqual([]);
  });
});

describe("localizarAgendamentoCheckin - lacunas da auditoria", () => {
  it("returns impedimento for motivo constructor", async () => {
    fetchMock.mockResolvedValue(corpoNegocio("constructor"));

    const resultado = await localizarAgendamentoCheckin("11977778888");

    expect(resultado).toEqual({
      tipo: "impedimento",
      mensagem: "Não foi possível continuar seu check-in. Por favor, procure a recepção.",
    });
  });

  it.each(["sem_agendamento_agora", "ja_registrado", "fora_da_janela"])(
    "does not expose the raw motivo %s in the result",
    async (motivo) => {
      fetchMock.mockResolvedValue(corpoNegocio(motivo, "Texto do CRM."));

      const resultado = await localizarAgendamentoCheckin("11977778888");

      expect(resultado.tipo).not.toBe("indisponivel");
      // `tipo` de fora_da_janela coincide com o motivo; o que não pode existir é o campo bruto.
      expect(resultado).not.toHaveProperty("motivo");
      expect(Object.values(resultado)).not.toContain(motivo === "fora_da_janela" ? "" : motivo);
      expect(resultado).toMatchObject({ mensagem: "Texto do CRM." });
    }
  );

  it("logs categoria sem_agendamento and a non-empty correlacao", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    fetchMock.mockResolvedValue(corpoNegocio("sem_agendamento_agora", "Nada agora."));

    await localizarAgendamentoCheckin("11977778888");

    const linhas = linhasLogLocalizar([info]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].categoria).toBe("sem_agendamento");
    expect(typeof linhas[0].correlacao).toBe("string");
    expect(linhas[0].correlacao.length).toBeGreaterThan(0);
  });

  it("logs categoria tecnico via console.warn with statusHttp 401 on a technical error (HTTP 401)", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue(respostaHttp(respostaTokenInvalido));

    await localizarAgendamentoCheckin("11987654321");

    const linhas = linhasLogLocalizar([info, warn]);
    const linhasWarn = linhasLogLocalizar([warn]);
    expect(linhas).toHaveLength(1);
    expect(linhasWarn).toHaveLength(1);
    expect(linhas[0].categoria).toBe("tecnico");
    expect(linhas[0].statusHttp).toBe(401);
    expect(linhas[0].desconhecido).toBe(false);
  });
});

describe("localizarAgendamentoCheckin - erros técnicos na localização", () => {
  const SEM_DADOS_PESSOAIS = ["Maria", "14:00", "Ana Lima"];

  describe("Cenário: CRM recusa a chave de acesso", () => {
    it("returns indisponivel without the CRM's 'Só um instante' text on HTTP 401", async () => {
      fetchMock.mockResolvedValue(respostaHttp(respostaTokenInvalido));

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({
        tipo: "indisponivel",
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
      expect(JSON.stringify(resultado)).not.toContain("Só um instante");
    });
  });

  describe("Esquema do Cenário: Outras falhas técnicas", () => {
    const sucessoCom = (alterar: (c: Record<string, unknown>) => void) => {
      const corpo: Record<string, unknown> = { ...respostaSucesso.corpo };
      alterar(corpo);
      return respostaHttp({ status: 200, corpo });
    };

    it.each([
      ["HTTP 500", () => respostaHttp({ status: 500, corpo: { ok: false } }), undefined],
      ["HTTP 503", () => respostaHttp({ status: 503, corpo: { ok: false } }), undefined],
      [
        "tempo esgotado",
        () => {
          throw new Error("não usado");
        },
        "timeout",
      ],
      ["erro de rede", () => Promise.reject(new TypeError("fetch failed")), "rede"],
      ["200 com corpo não JSON", () => new Response("x", { status: 200 }), undefined],
      [
        "200 sem ok",
        () =>
          respostaHttp({
            status: 200,
            corpo: { motivo: "x", primeiro_nome: "Maria" },
          }),
        undefined,
      ],
      [
        "sucesso sem profissional",
        () =>
          sucessoCom((c) => {
            delete c.profissional;
          }),
        undefined,
      ],
      [
        "sucesso sem consulta_id",
        () =>
          sucessoCom((c) => {
            delete c.consulta_id;
          }),
        undefined,
      ],
    ])("returns indisponivel without personal data on %s", async (_rotulo, resposta, modo) => {
      if (modo === "timeout") {
        vi.stubEnv("CRM_TIMEOUT_MS", "50");
        fetchMock.mockImplementation(
          (_url: unknown, init: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener("abort", () => reject(init.signal.reason));
            })
        );
      } else {
        fetchMock.mockImplementation(async () => resposta());
      }
      vi.spyOn(console, "warn").mockImplementation(() => {});

      const resultado = await localizarAgendamentoCheckin("11987654321");

      expect(resultado).toEqual({
        tipo: "indisponivel",
        mensagem: MENSAGEM_ERRO_TECNICO,
      });
      const serializado = JSON.stringify(resultado);
      for (const dado of SEM_DADOS_PESSOAIS) expect(serializado).not.toContain(dado);
    });
  });

  describe("Cenário: Registro técnico sem dados pessoais", () => {
    it("logs one crm.localizar line in console.warn with statusHttp, causa and correlacao on HTTP 500", async () => {
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      fetchMock.mockResolvedValue(respostaHttp({ status: 500, corpo: { ok: false } }));

      await localizarAgendamentoCheckin("11987654321");

      const linhasWarn = linhasLogLocalizar([warn]);
      const todas = [info, warn, log, error]
        .flatMap((e) => e.mock.calls)
        .map((a) => JSON.stringify(a));
      expect(linhasWarn).toHaveLength(1);
      expect(linhasWarn[0]).toMatchObject({
        evento: "crm.localizar",
        operacao: "localizar",
        categoria: "tecnico",
        causa: "status_http",
        statusHttp: 500,
        ok: false,
      });
      expect(typeof linhasWarn[0].duracaoMs).toBe("number");
      expect(linhasWarn[0].duracaoMs).toBeGreaterThanOrEqual(0);
      expect(typeof linhasWarn[0].correlacao).toBe("string");
      expect(linhasWarn[0].correlacao.length).toBeGreaterThan(0);
      expect(todas.filter((l) => l.includes("11987654321"))).toEqual([]);
      expect(todas.filter((l) => l.includes(CHAVE))).toEqual([]);
    });

    it("logs causa tempo_esgotado with statusHttp null when the CRM does not answer in time", async () => {
      vi.stubEnv("CRM_TIMEOUT_MS", "50");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      fetchMock.mockImplementation(
        (_url: unknown, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => reject(init.signal.reason));
          })
      );

      await localizarAgendamentoCheckin("11987654321");

      const linhas = linhasLogLocalizar([warn]);
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({
        operacao: "localizar",
        categoria: "tecnico",
        causa: "tempo_esgotado",
        statusHttp: null,
      });
    });
  });
});

const MSG_SUCESSO_PADRAO = "Sua chegada foi registrada. Aguarde, você será chamado(a) em breve.";
const MSG_JA_REGISTRADO_PADRAO =
  "Sua chegada já estava registrada. Aguarde, você será chamado(a) em breve.";
const MSG_IMPEDIMENTO_PADRAO =
  "Não foi possível continuar seu check-in. Por favor, procure a recepção.";

async function obterComprovante(): Promise<string> {
  fetchMock.mockResolvedValueOnce(respostaHttp(respostaSucesso));
  const r = await localizarAgendamentoCheckin("11987654321");
  if (r.tipo !== "encontrado") throw new Error("localização de apoio falhou");
  fetchMock.mockReset();
  return r.comprovante;
}

function linhasLogConfirmar(espioes: { mock: { calls: unknown[][] } }[]) {
  return espioes
    .flatMap((e) => e.mock.calls)
    .map((args) => String(args[0]))
    .flatMap((linha) => {
      try {
        const json = JSON.parse(linha);
        return json && json.evento === "crm.confirmar" ? [json] : [];
      } catch {
        return [];
      }
    });
}

describe("confirmarChegadaCheckin", () => {
  describe("Cenário: Chegada confirmada", () => {
    it("returns chegada_registrada with the CRM message and sends consulta_id to the CRM once", async () => {
      const comprovante = await obterComprovante();
      fetchMock.mockResolvedValue(respostaHttp(respostaConfirmacaoSucesso));

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual({
        tipo: "chegada_registrada",
        mensagem: respostaConfirmacaoSucesso.corpo.mensagem,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe(`${URL_BASE}/agenda/confirmar`);
      expect(init.method).toBe("POST");
      expect(new Headers(init.headers).get("x-api-key")).toBe(CHAVE);
      expect(JSON.parse(init.body)).toEqual({ consulta_id: consultaIdLocalizada });
    });

    it("uses the default success text when the CRM sends no message", async () => {
      const comprovante = await obterComprovante();
      fetchMock.mockResolvedValue(
        respostaHttp({ status: 200, corpo: { ok: true, status: "realizada" } })
      );

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual({ tipo: "chegada_registrada", mensagem: MSG_SUCESSO_PADRAO });
    });
  });

  describe("Cenário: Chegada já registrada na confirmação", () => {
    it("returns chegada_registrada with the CRM message for ja_registrado", async () => {
      const comprovante = await obterComprovante();
      fetchMock.mockResolvedValue(respostaHttp(respostaConfirmacaoJaRegistrado));

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual({
        tipo: "chegada_registrada",
        mensagem: "Sua chegada já foi registrada.",
      });
    });

    it("uses the default already-registered text when the CRM sends no message", async () => {
      const comprovante = await obterComprovante();
      fetchMock.mockResolvedValue(corpoNegocio("ja_registrado"));

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual({ tipo: "chegada_registrada", mensagem: MSG_JA_REGISTRADO_PADRAO });
    });
  });

  describe("Cenário: Consulta não encontrada na confirmação", () => {
    it("returns nao_encontrada with the CRM message", async () => {
      const comprovante = await obterComprovante();
      fetchMock.mockResolvedValue(respostaHttp(respostaConfirmacaoNaoEncontrada));

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual({
        tipo: "nao_encontrada",
        mensagem: "Não encontrei essa consulta.",
      });
    });
  });

  describe("Esquema do Cenário: Motivo fora da tabela ou sem mensagem na confirmação", () => {
    it.each([
      [
        "dados_invalidos com mensagem",
        respostaConfirmacaoDadosInvalidos.corpo,
        { tipo: "impedimento", mensagem: "Faltou alguma informação para eu concluir." },
      ],
      [
        "dados_invalidos sem mensagem",
        { ok: false, motivo: "dados_invalidos" },
        { tipo: "impedimento", mensagem: MSG_IMPEDIMENTO_PADRAO },
      ],
      [
        "dados_invalidos com mensagem em branco",
        { ok: false, motivo: "dados_invalidos", mensagem: "  " },
        { tipo: "impedimento", mensagem: MSG_IMPEDIMENTO_PADRAO },
      ],
      [
        "nao_encontrada sem mensagem",
        { ok: false, motivo: "nao_encontrada" },
        { tipo: "nao_encontrada", mensagem: "Não encontrei essa consulta." },
      ],
    ])("returns the expected result for %s", async (_rotulo, corpo, esperado) => {
      const comprovante = await obterComprovante();
      fetchMock.mockResolvedValue(respostaHttp({ status: 200, corpo }));

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual(esperado);
      expect(JSON.stringify(resultado)).not.toContain("dados_invalidos");
    });

    it("logs the unknown motivo with console.warn and desconhecido true", async () => {
      const comprovante = await obterComprovante();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "info").mockImplementation(() => {});
      fetchMock.mockResolvedValue(respostaHttp(respostaConfirmacaoDadosInvalidos));

      await confirmarChegadaCheckin(comprovante);

      const linhas = linhasLogConfirmar([warn]);
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({
        operacao: "confirmar",
        motivo: "dados_invalidos",
        desconhecido: true,
      });
    });
  });

  describe("Esquema do Cenário: Comprovante do agendamento recusado", () => {
    const recusa = { tipo: "indisponivel", mensagem: MENSAGEM_ERRO_TECNICO };
    const T0 = new Date("2026-11-26T10:00:00Z");

    afterEach(() => {
      vi.useRealTimers();
    });

    it("refuses a comprovante issued more than 5 minutes ago without calling the CRM", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(T0);
      const comprovante = await obterComprovante();
      vi.setSystemTime(new Date(T0.getTime() + 5 * 60_000 + 1000));

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual(recusa);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("accepts a comprovante still inside the 5 minute window", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(T0);
      const comprovante = await obterComprovante();
      vi.setSystemTime(new Date(T0.getTime() + 4 * 60_000));
      fetchMock.mockResolvedValue(respostaHttp(respostaConfirmacaoSucesso));

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado.tipo).toBe("chegada_registrada");
    });

    it("refuses a tampered comprovante without calling the CRM", async () => {
      const comprovante = await obterComprovante();
      const meio = Math.floor(comprovante.length / 2);
      const troca = comprovante[meio] === "A" ? "B" : "A";
      const adulterado = comprovante.slice(0, meio) + troca + comprovante.slice(meio + 1);

      const resultado = await confirmarChegadaCheckin(adulterado);

      expect(resultado).toEqual(recusa);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuses a comprovante issued for another tablet without calling the CRM", async () => {
      const comprovante = await obterComprovante();
      definirCookieAcesso(gerarAutorizacao(CHAVE_ACESSO, "dispositivo-2"));

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual(recusa);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ["undefined", undefined],
      ["null", null],
      ["string vazia", ""],
      ["número", 123],
      ["objeto", {}],
      ["texto qualquer", "nao-e-um-comprovante"],
    ])(
      "refuses a missing or malformed comprovante (%s) without calling the CRM",
      async (_r, entrada) => {
        const resultado = await confirmarChegadaCheckin(entrada as unknown as string);

        expect(resultado).toEqual(recusa);
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );

    it.each([
      ["sem cookie", () => undefined],
      ["cookie adulterado", () => `${gerarAutorizacao(CHAVE_ACESSO, "dispositivo-1")}x`],
      ["cookie de outra chave", () => gerarAutorizacao(OUTRA_CHAVE_ACESSO, "dispositivo-1")],
    ])("refuses the confirmation with %s without calling the CRM", async (_r, valor) => {
      const comprovante = await obterComprovante();
      definirCookieAcesso(valor());

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual(recusa);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(["CRM_API_KEY", "CRM_BASE_URL"])(
      "refuses a valid comprovante without calling the CRM when %s is empty",
      async (variavel) => {
        const comprovante = await obterComprovante();
        vi.stubEnv(variavel, "");

        const resultado = await confirmarChegadaCheckin(comprovante);

        expect(resultado).toEqual(recusa);
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );

    it("refuses the confirmation when the flag is off, without calling the CRM", async () => {
      const comprovante = await obterComprovante();
      vi.stubEnv("CRM_CHECKIN_ENABLED", "false");

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual(recusa);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("Esquema do Cenário: Falha técnica na confirmação", () => {
    it.each([
      [
        "HTTP 401 com Só um instante",
        () => respostaHttp(respostaConfirmacaoTokenInvalido),
        undefined,
      ],
      ["HTTP 500", () => respostaHttp({ status: 500, corpo: { ok: false } }), undefined],
      ["tempo esgotado", () => respostaHttp({ status: 500, corpo: {} }), "timeout"],
      ["erro de rede", () => Promise.reject(new TypeError("fetch failed")), undefined],
      [
        "200 sem ok",
        () => respostaHttp({ status: 200, corpo: { status: "realizada" } }),
        undefined,
      ],
    ])("returns indisponivel with the technical message on %s", async (_r, resposta, modo) => {
      const comprovante = await obterComprovante();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      if (modo === "timeout") {
        vi.stubEnv("CRM_TIMEOUT_MS", "50");
        fetchMock.mockImplementation(
          (_url: unknown, init: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener("abort", () => reject(init.signal.reason));
            })
        );
      } else {
        fetchMock.mockImplementation(async () => resposta());
      }

      const resultado = await confirmarChegadaCheckin(comprovante);

      expect(resultado).toEqual({ tipo: "indisponivel", mensagem: MENSAGEM_ERRO_TECNICO });
      expect(JSON.stringify(resultado)).not.toContain("Só um instante");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cenário: Registro técnico da confirmação sem dados pessoais", () => {
    it("logs one crm.confirmar line in console.warn on HTTP 500 without phone, name, consulta_id or key", async () => {
      const comprovante = await obterComprovante();
      const espioes = (["log", "info", "warn", "error"] as const).map((m) =>
        vi.spyOn(console, m).mockImplementation(() => {})
      );
      fetchMock.mockResolvedValue(respostaHttp({ status: 500, corpo: { ok: false } }));

      await confirmarChegadaCheckin(comprovante);

      const linhas = linhasLogConfirmar([espioes[2]]);
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({
        evento: "crm.confirmar",
        operacao: "confirmar",
        categoria: "tecnico",
        causa: "status_http",
        statusHttp: 500,
      });
      expect(typeof linhas[0].duracaoMs).toBe("number");
      expect(linhas[0].correlacao.length).toBeGreaterThan(0);
      const todas = espioes.flatMap((e) => e.mock.calls).map((a) => JSON.stringify(a));
      for (const proibido of ["11987654321", "Maria", consultaIdLocalizada, CHAVE]) {
        expect(todas.filter((l) => l.includes(proibido))).toEqual([]);
      }
    });

    it("logs crm.confirmar with console.info on success, without consulta_id", async () => {
      const comprovante = await obterComprovante();
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      fetchMock.mockResolvedValue(respostaHttp(respostaConfirmacaoSucesso));

      await confirmarChegadaCheckin(comprovante);

      const linhas = linhasLogConfirmar([info]);
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({ operacao: "confirmar", statusHttp: 200, ok: true });
      expect(linhasLogConfirmar([warn])).toEqual([]);
      expect(JSON.stringify(info.mock.calls)).not.toContain(consultaIdLocalizada);
    });
  });
});

describe("Cenário: O dispositivo não recebe o identificador da consulta", () => {
  it("returns an opaque comprovante with neither consulta_id nor full name in the response", async () => {
    fetchMock.mockResolvedValue(respostaHttp(respostaSucesso));

    const resultado = await localizarAgendamentoCheckin("11987654321");

    expect(resultado.tipo).toBe("encontrado");
    const serializado = JSON.stringify(resultado);
    expect(serializado).not.toContain(consultaIdLocalizada);
    expect(serializado).not.toContain("Maria Souza");
    expect(serializado).not.toContain("Souza");
    if (resultado.tipo === "encontrado") {
      expect(resultado.comprovante.length).toBeGreaterThan(0);
    }
  });
});
