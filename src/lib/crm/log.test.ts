import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { registrarLocalizacao } from "./log";

const dados = {
  categoria: "sem_agendamento" as const,
  motivo: "sem_agendamento_agora",
  desconhecido: false,
  statusHttp: 200 as number | null,
  ok: false as boolean | null,
  duracaoMs: 123,
  correlacao: "abc-123",
};

describe("registrarLocalizacao", () => {
  let info: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("escreve uma linha JSON via console.info quando o motivo é conhecido", () => {
    registrarLocalizacao(dados);
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("escreve via console.warn quando o motivo é desconhecido", () => {
    registrarLocalizacao({ ...dados, categoria: "desconhecido", desconhecido: true });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
  });

  it("logs technical errors with console.warn", () => {
    registrarLocalizacao({
      categoria: "tecnico",
      causa: "status_http",
      desconhecido: false,
      statusHttp: 500,
      ok: null,
      duracaoMs: 90,
      correlacao: "tec-1",
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toMatchObject({
      operacao: "localizar",
      categoria: "tecnico",
      causa: "status_http",
      statusHttp: 500,
      ok: null,
    });
  });

  it("escreve JSON parseável com evento crm.localizar e os campos informados", () => {
    registrarLocalizacao(dados);
    const linha = info.mock.calls[0][0];
    expect(typeof linha).toBe("string");
    expect(JSON.parse(linha as string)).toEqual({
      evento: "crm.localizar",
      operacao: "localizar",
      ...dados,
    });
  });

  it("não escreve propriedades extras como telefone e nome", () => {
    registrarLocalizacao({ ...dados, telefone: "11987654321", nome: "Maria Souza" } as never);
    const linha = info.mock.calls[0][0] as string;
    expect(Object.keys(JSON.parse(linha)).sort()).toEqual(
      [
        "categoria",
        "correlacao",
        "desconhecido",
        "duracaoMs",
        "evento",
        "motivo",
        "ok",
        "operacao",
        "statusHttp",
      ].sort()
    );
    expect(linha).not.toContain("11987654321");
    expect(linha).not.toContain("Maria Souza");
  });

  it("registra motivo fora da tabela (dados_invalidos) como desconhecido, sem o telefone", () => {
    registrarLocalizacao({
      categoria: "desconhecido",
      motivo: "dados_invalidos",
      desconhecido: true,
      statusHttp: 200,
      ok: false,
      duracaoMs: 40,
      correlacao: "xyz-9",
      telefone: "11987654321",
    } as never);
    expect(warn).toHaveBeenCalledTimes(1);
    const linha = warn.mock.calls[0][0] as string;
    const obj = JSON.parse(linha);
    expect(obj.motivo).toBe("dados_invalidos");
    expect(obj.desconhecido).toBe(true);
    expect(linha).not.toContain("11987654321");
  });

  it("Registro técnico sem dados pessoais", () => {
    registrarLocalizacao({
      categoria: "tecnico",
      causa: "sem_resposta",
      desconhecido: false,
      statusHttp: null,
      ok: null,
      duracaoMs: 10,
      correlacao: "tec-2",
      telefone: "11987654321",
      apiKey: "chave-de-teste",
    } as never);
    const linha = warn.mock.calls[0][0] as string;
    expect(linha).not.toContain("11987654321");
    expect(linha).not.toContain("chave-de-teste");
    const obj = JSON.parse(linha);
    expect(obj).not.toHaveProperty("telefone");
    expect(obj).not.toHaveProperty("apiKey");
  });
});
