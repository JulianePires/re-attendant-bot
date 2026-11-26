import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { confirmarNoCrm, localizarNoCrm } from "./client";
import { respostaSucesso, respostaTokenInvalido } from "./__fixtures__/localizar";
import {
  consultaIdLocalizada,
  respostaConfirmacaoSucesso,
  respostaConfirmacaoTokenInvalido,
} from "./__fixtures__/confirmar";

const config = {
  baseUrl: "https://crm.exemplo.test/functions/v1",
  apiKey: "chave-de-teste",
  timeoutMs: 8000,
};

const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("localizarNoCrm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns encontrado with status 200 and ok true when the CRM finds the appointment", async () => {
    fetchMock.mockResolvedValue(json(respostaSucesso.status, respostaSucesso.corpo));

    const r = await localizarNoCrm(config, "11987654321");

    expect(r.resultado.tipo).toBe("encontrado");
    expect(r.statusHttp).toBe(200);
    expect(r.ok).toBe(true);
  });

  it("CRM recusa a chave de acesso", async () => {
    fetchMock.mockResolvedValue(json(respostaTokenInvalido.status, respostaTokenInvalido.corpo));

    const r = await localizarNoCrm(config, "11987654321");

    expect(r.resultado).toMatchObject({ tipo: "tecnico", causa: "status_http" });
    expect(r.statusHttp).toBe(401);
    expect(r.ok).toBe(false);
  });

  it.each([500, 503])("classifies HTTP %i as technical status_http", async (status) => {
    fetchMock.mockResolvedValue(json(status, { ok: false }));

    const r = await localizarNoCrm(config, "11987654321");

    expect(r.resultado).toMatchObject({ tipo: "tecnico", causa: "status_http" });
    expect(r.statusHttp).toBe(status);
  });

  it("CRM não responde em 8 segundos", async () => {
    fetchMock.mockImplementation(
      (_url: unknown, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          const sinal = init.signal as AbortSignal;
          sinal.addEventListener("abort", () => reject(sinal.reason));
        })
    );

    const r = await localizarNoCrm({ ...config, timeoutMs: 50 }, "11987654321");

    expect(r.resultado).toEqual({ tipo: "tecnico", causa: "tempo_esgotado" });
    expect(r.statusHttp).toBeNull();
    expect(r.ok).toBeNull();
  });

  it("classifies a network failure as sem_resposta", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const r = await localizarNoCrm(config, "11987654321");

    expect(r.resultado).toEqual({ tipo: "tecnico", causa: "sem_resposta" });
    expect(r.statusHttp).toBeNull();
    expect(r.ok).toBeNull();
  });

  it("classifies HTTP 200 with a non-JSON body as resposta_invalida", async () => {
    fetchMock.mockResolvedValue(new Response("isto não é json", { status: 200 }));

    const r = await localizarNoCrm(config, "11987654321");

    expect(r.resultado).toEqual({ tipo: "tecnico", causa: "resposta_invalida" });
    expect(r.statusHttp).toBe(200);
    expect(r.ok).toBeNull();
  });

  it("returns ok null when the body ok is not a boolean", async () => {
    fetchMock.mockResolvedValue(json(200, { ok: "true", motivo: "x" }));

    const r = await localizarNoCrm(config, "11987654321");

    expect(r.ok).toBeNull();
  });

  it("classifies an AbortError as tempo_esgotado", async () => {
    fetchMock.mockRejectedValue(new DOMException("abortado", "AbortError"));

    const r = await localizarNoCrm(config, "11987654321");

    expect(r.resultado).toEqual({ tipo: "tecnico", causa: "tempo_esgotado" });
    expect(r.statusHttp).toBeNull();
  });

  it("classifies a timeout while reading the body as tempo_esgotado", async () => {
    const resposta = new Response("{}", { status: 200 });
    vi.spyOn(resposta, "json").mockRejectedValue(new DOMException("x", "TimeoutError"));
    fetchMock.mockResolvedValue(resposta);

    const r = await localizarNoCrm(config, "11987654321");

    expect(r.resultado).toEqual({ tipo: "tecnico", causa: "tempo_esgotado" });
  });

  it("sends the request with an abort signal and no-store cache", async () => {
    fetchMock.mockResolvedValue(json(respostaSucesso.status, respostaSucesso.corpo));

    await localizarNoCrm(config, "11987654321");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.cache).toBe("no-store");
  });
});

describe("confirmarNoCrm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the CRM result with status 200 and ok true when the arrival is confirmed", async () => {
    fetchMock.mockResolvedValue(
      json(respostaConfirmacaoSucesso.status, respostaConfirmacaoSucesso.corpo)
    );

    const r = await confirmarNoCrm(config, consultaIdLocalizada);

    expect(r.resultado).toMatchObject({ tipo: "confirmado" });
    expect(r.statusHttp).toBe(200);
    expect(r.ok).toBe(true);
  });

  it("sends POST to /agenda/confirmar with api key, consulta_id body and abort signal", async () => {
    fetchMock.mockResolvedValue(
      json(respostaConfirmacaoSucesso.status, respostaConfirmacaoSucesso.corpo)
    );

    await confirmarNoCrm(config, consultaIdLocalizada);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    expect(String(url)).toBe(`${config.baseUrl}/agenda/confirmar`);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("x-api-key")).toBe(config.apiKey);
    expect(JSON.parse(init.body as string)).toEqual({ consulta_id: consultaIdLocalizada });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("classifies HTTP 401 as technical status_http", async () => {
    fetchMock.mockResolvedValue(
      json(respostaConfirmacaoTokenInvalido.status, respostaConfirmacaoTokenInvalido.corpo)
    );

    const r = await confirmarNoCrm(config, consultaIdLocalizada);

    expect(r.resultado).toMatchObject({ tipo: "tecnico", causa: "status_http" });
    expect(r.statusHttp).toBe(401);
    expect(r.ok).toBe(false);
  });

  it("classifies HTTP 500 as technical status_http", async () => {
    fetchMock.mockResolvedValue(json(500, { ok: false }));

    const r = await confirmarNoCrm(config, consultaIdLocalizada);

    expect(r.resultado).toMatchObject({ tipo: "tecnico", causa: "status_http" });
    expect(r.statusHttp).toBe(500);
  });

  it("classifies no answer within the timeout as tempo_esgotado", async () => {
    fetchMock.mockImplementation(
      (_url: unknown, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          const sinal = init.signal as AbortSignal;
          sinal.addEventListener("abort", () => reject(sinal.reason));
        })
    );

    const r = await confirmarNoCrm({ ...config, timeoutMs: 50 }, consultaIdLocalizada);

    expect(r.resultado).toEqual({ tipo: "tecnico", causa: "tempo_esgotado" });
    expect(r.statusHttp).toBeNull();
    expect(r.ok).toBeNull();
  });

  it("classifies a network failure as sem_resposta", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const r = await confirmarNoCrm(config, consultaIdLocalizada);

    expect(r.resultado).toEqual({ tipo: "tecnico", causa: "sem_resposta" });
    expect(r.statusHttp).toBeNull();
    expect(r.ok).toBeNull();
  });

  it("classifies HTTP 200 with a non-JSON body as resposta_invalida", async () => {
    fetchMock.mockResolvedValue(new Response("isto não é json", { status: 200 }));

    const r = await confirmarNoCrm(config, consultaIdLocalizada);

    expect(r.resultado).toEqual({ tipo: "tecnico", causa: "resposta_invalida" });
    expect(r.statusHttp).toBe(200);
    expect(r.ok).toBeNull();
  });
});
