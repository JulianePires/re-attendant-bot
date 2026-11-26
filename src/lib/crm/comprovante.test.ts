import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { VALIDADE_COMPROVANTE_MS, abrirComprovante, emitirComprovante } from "./comprovante";
import { consultaIdLocalizada } from "./__fixtures__/confirmar";

const CHAVE = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres";
const OUTRA_CHAVE = "outra-chave-de-teste-com-mais-de-trinta-e-dois-chars";
const DISPOSITIVO = "tablet-recepcao-01";
const T0 = 1_800_000_000_000;

const dados = {
  consultaId: consultaIdLocalizada,
  nome: "Maria Souza",
  primeiroNome: "Maria",
  idDispositivo: DISPOSITIVO,
};

const esperado = {
  consultaId: consultaIdLocalizada,
  nome: "Maria Souza",
  primeiroNome: "Maria",
};

describe("comprovante", () => {
  it("expõe a validade de 5 minutos", () => {
    expect(VALIDADE_COMPROVANTE_MS).toBe(300_000);
  });

  it("opens the receipt it just issued returning the same data", () => {
    const c = emitirComprovante(dados, CHAVE, T0);
    expect(abrirComprovante(c, CHAVE, DISPOSITIVO, T0)).toEqual(esperado);
  });

  it("still opens at 299.999 ms after issuing", () => {
    const c = emitirComprovante(dados, CHAVE, T0);
    expect(abrirComprovante(c, CHAVE, DISPOSITIVO, T0 + 299_999)).toEqual(esperado);
  });

  it("returns null at exactly 300.000 ms after issuing", () => {
    const c = emitirComprovante(dados, CHAVE, T0);
    expect(abrirComprovante(c, CHAVE, DISPOSITIVO, T0 + 300_000)).toBeNull();
  });

  it("returns null when tampered in the middle", () => {
    const c = emitirComprovante(dados, CHAVE, T0);
    const meio = Math.floor(c.length / 2);
    const troca = c[meio] === "A" ? "B" : "A";
    const adulterado = c.slice(0, meio) + troca + c.slice(meio + 1);
    expect(adulterado).not.toBe(c);
    expect(abrirComprovante(adulterado, CHAVE, DISPOSITIVO, T0)).toBeNull();
  });

  it("returns null for another device", () => {
    const c = emitirComprovante(dados, CHAVE, T0);
    expect(abrirComprovante(c, CHAVE, "tablet-outro", T0)).toBeNull();
  });

  it("returns null for another key", () => {
    const c = emitirComprovante(dados, CHAVE, T0);
    expect(abrirComprovante(c, OUTRA_CHAVE, DISPOSITIVO, T0)).toBeNull();
  });

  it.each([
    ["undefined", undefined],
    ["string vazia", ""],
    ["lixo", "isto-nao-e-um-comprovante"],
    ["base64url curto", "AAAA"],
  ])("returns null for %s", (_nome, valor) => {
    expect(abrirComprovante(valor, CHAVE, DISPOSITIVO, T0)).toBeNull();
  });

  it("is opaque text without the consultaId or the name", () => {
    const c = emitirComprovante(dados, CHAVE, T0);
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    const decodificado = Buffer.from(c, "base64url").toString("latin1");
    for (const texto of [c, decodificado]) {
      expect(texto).not.toContain(consultaIdLocalizada);
      expect(texto).not.toContain("Maria Souza");
    }
  });

  it("produces different receipts for the same data (random IV)", () => {
    const a = emitirComprovante(dados, CHAVE, T0);
    const b = emitirComprovante(dados, CHAVE, T0);
    expect(a).not.toBe(b);
  });
});
