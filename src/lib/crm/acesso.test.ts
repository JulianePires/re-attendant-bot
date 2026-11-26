import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  NOME_COOKIE_ACESSO,
  VALIDADE_ACESSO_SEGUNDOS,
  chaveAcessoConfere,
  gerarAutorizacao,
  validarAutorizacao,
} from "./acesso";

const CHAVE = "chave-da-clinica-com-32-caracteres!!";
const CHAVE_ANTERIOR = "chave-anterior-da-clinica-32-caracteres";

describe("acesso constantes", () => {
  it("uses the agreed cookie name", () => {
    expect(NOME_COOKIE_ACESSO).toBe("totem_crm_acesso");
  });

  it("keeps the authorization valid for 400 days", () => {
    expect(VALIDADE_ACESSO_SEGUNDOS).toBe(400 * 24 * 60 * 60);
  });
});

describe("chaveAcessoConfere", () => {
  it("accepts identical keys", () => {
    expect(chaveAcessoConfere(CHAVE, CHAVE)).toBe(true);
  });

  it("rejects a key that differs by one character", () => {
    const quaseIgual = CHAVE.slice(0, -1) + "?";
    expect(chaveAcessoConfere(quaseIgual, CHAVE)).toBe(false);
  });

  it("rejects a key with a different length", () => {
    expect(chaveAcessoConfere(CHAVE + "x", CHAVE)).toBe(false);
    expect(chaveAcessoConfere(CHAVE.slice(0, -1), CHAVE)).toBe(false);
  });

  it("rejects an empty key", () => {
    expect(chaveAcessoConfere("", CHAVE)).toBe(false);
  });
});

describe("gerarAutorizacao", () => {
  it("returns the format id.signature", () => {
    const valor = gerarAutorizacao(CHAVE, "tablet-1");
    const partes = valor.split(".");
    expect(partes).toHaveLength(2);
    expect(partes[0]).toBe("tablet-1");
    expect(partes[1].length).toBeGreaterThan(0);
  });

  it("generates a random device id when none is given", () => {
    const a = gerarAutorizacao(CHAVE);
    const b = gerarAutorizacao(CHAVE);
    expect(a).not.toBe(b);
    expect(a.split(".")[0].length).toBeGreaterThan(0);
    expect(a.split(".")[0]).not.toBe(b.split(".")[0]);
  });

  it("does not contain the key", () => {
    expect(gerarAutorizacao(CHAVE, "tablet-1")).not.toContain(CHAVE);
    expect(gerarAutorizacao(CHAVE)).not.toContain(CHAVE);
  });
});

describe("validarAutorizacao", () => {
  it("returns the device id when the signature matches the key", () => {
    const valor = gerarAutorizacao(CHAVE, "tablet-1");
    expect(validarAutorizacao(valor, CHAVE)).toBe("tablet-1");
  });

  it("returns the generated device id for an authorization without explicit id", () => {
    const valor = gerarAutorizacao(CHAVE);
    expect(validarAutorizacao(valor, CHAVE)).toBe(valor.split(".")[0]);
  });

  it("returns null when the value is undefined", () => {
    expect(validarAutorizacao(undefined, CHAVE)).toBeNull();
  });

  it("returns null when the value is empty", () => {
    expect(validarAutorizacao("", CHAVE)).toBeNull();
  });

  it("returns null when the value has no dot", () => {
    expect(validarAutorizacao("semponto", CHAVE)).toBeNull();
  });

  it("returns null when the signature was tampered with", () => {
    const [id, assinatura] = gerarAutorizacao(CHAVE, "tablet-1").split(".");
    const ultimo = assinatura.slice(-1) === "A" ? "B" : "A";
    const adulterada = `${id}.${assinatura.slice(0, -1)}${ultimo}`;
    expect(validarAutorizacao(adulterada, CHAVE)).toBeNull();
  });

  it("returns null when the id is swapped keeping the signature", () => {
    const [, assinatura] = gerarAutorizacao(CHAVE, "tablet-1").split(".");
    expect(validarAutorizacao(`tablet-2.${assinatura}`, CHAVE)).toBeNull();
  });

  it("returns null for an authorization made with the previous key", () => {
    const valor = gerarAutorizacao(CHAVE_ANTERIOR, "tablet-1");
    expect(validarAutorizacao(valor, CHAVE)).toBeNull();
  });
});
