import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { registrarLocalizacao } from "./log";

const dados = {
  categoria: "sem_agendamento",
  motivo: "sem_agendamento_agora",
  desconhecido: false,
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

  it("escreve JSON parseável com evento crm.localizar e os campos informados", () => {
    registrarLocalizacao(dados);
    const linha = info.mock.calls[0][0];
    expect(typeof linha).toBe("string");
    expect(JSON.parse(linha as string)).toEqual({ evento: "crm.localizar", ...dados });
  });

  it("não escreve propriedades extras como telefone e nome", () => {
    registrarLocalizacao({ ...dados, telefone: "11987654321", nome: "Maria Souza" } as never);
    const linha = info.mock.calls[0][0] as string;
    expect(Object.keys(JSON.parse(linha)).sort()).toEqual(
      ["categoria", "correlacao", "desconhecido", "duracaoMs", "evento", "motivo"].sort()
    );
    expect(linha).not.toContain("11987654321");
    expect(linha).not.toContain("Maria Souza");
  });

  it("registra motivo fora da tabela (dados_invalidos) como desconhecido, sem o telefone", () => {
    registrarLocalizacao({
      categoria: "desconhecido",
      motivo: "dados_invalidos",
      desconhecido: true,
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
});
