import { describe, it, expect } from "vitest";
import { extrairDigitos, validarTelefone, formatarTelefone } from "./telefone";

const MENSAGEM_DDD = "Digite o telefone com DDD.";

describe("extrairDigitos", () => {
  it("removes mask characters keeping only digits", () => {
    expect(extrairDigitos("(11) 98765-4321")).toBe("11987654321");
  });

  it("returns empty string when input has no digits", () => {
    expect(extrairDigitos("abc -()")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(extrairDigitos("")).toBe("");
  });

  it("keeps a digit-only input unchanged", () => {
    expect(extrairDigitos("5511987654321")).toBe("5511987654321");
  });
});

describe("validarTelefone", () => {
  // Cenário: Formatos de telefone aceitos
  it.each([
    ["11987654321", "11987654321"], // 11 dígitos (DDD + 9)
    ["5511987654321", "5511987654321"], // 13 dígitos com 55, mantido
    ["1132654321", "1132654321"], // 10 dígitos (fixo)
    ["(11) 98765-4321", "11987654321"], // entrada mascarada
  ])(
    "accepts phone format %s and returns digits %s (Formatos de telefone aceitos)",
    (digitado, enviado) => {
      const resultado = validarTelefone(digitado);

      expect(resultado).toEqual({ valido: true, digitos: enviado });
    }
  );

  it("keeps the 55 prefix on a 12-digit number (55 + landline)", () => {
    expect(validarTelefone("551132654321")).toEqual({
      valido: true,
      digitos: "551132654321",
    });
  });

  // Cenário: Telefone com menos de 10 dígitos (valor limite)
  it.each([
    ["", "0 dígitos"],
    ["1", "1 dígito"],
    ["119876543", "9 dígitos, limite inferior - 1"],
  ])("rejects %j with DDD message (%s) (Telefone com menos de 10 dígitos)", (digitado) => {
    const resultado = validarTelefone(digitado);

    expect(resultado).toEqual({ valido: false, mensagem: MENSAGEM_DDD });
  });

  it("rejects 9 digits even when typed with mask characters", () => {
    expect(validarTelefone("(11) 9876-543")).toEqual({
      valido: false,
      mensagem: MENSAGEM_DDD,
    });
  });

  it("accepts exactly 10 digits, the lower bound (Telefone com menos de 10 dígitos)", () => {
    expect(validarTelefone("1198765432")).toEqual({
      valido: true,
      digitos: "1198765432",
    });
  });

  it("accepts exactly 11 digits, the upper bound without 55", () => {
    expect(validarTelefone("11987654321")).toEqual({
      valido: true,
      digitos: "11987654321",
    });
  });

  // Decisão: 14 dígitos não casa com nenhum formato (10, 11, 12 ou 13) e é inválido.
  it("rejects 14 digits, one above the 55 + 11 upper bound", () => {
    const resultado = validarTelefone("55119876543210");

    expect(resultado.valido).toBe(false);
    if (!resultado.valido) {
      expect(resultado.mensagem.length).toBeGreaterThan(0);
    }
  });

  it("rejects an oversized payload of digits", () => {
    expect(validarTelefone("1".repeat(500)).valido).toBe(false);
  });

  it("rejects input without any digit as empty", () => {
    expect(validarTelefone("abc")).toEqual({
      valido: false,
      mensagem: MENSAGEM_DDD,
    });
  });

  it("ignores non-digit characters before counting length", () => {
    expect(validarTelefone("  11 98765-4321  ")).toEqual({
      valido: true,
      digitos: "11987654321",
    });
  });
});

describe("formatarTelefone", () => {
  // Cenário: Paciente corrige o número antes de buscar
  it("formats 11 digits as (DD) 9XXXX-XXXX (Paciente corrige o número)", () => {
    expect(formatarTelefone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formats 10 digits as (DD) XXXX-XXXX", () => {
    expect(formatarTelefone("1132654321")).toBe("(11) 3265-4321");
  });

  it("formats a partial number progressively after the DDD", () => {
    expect(formatarTelefone("119876")).toBe("(11) 9876");
  });

  it("opens the parenthesis for a partial DDD of 2 digits", () => {
    expect(formatarTelefone("11")).toBe("(11");
  });

  it("returns empty string for empty input", () => {
    expect(formatarTelefone("")).toBe("");
  });

  it("shows the corrected number after deleting and retyping the last digits", () => {
    // 1198765432 -> apaga o último -> 119876543 -> digita "21" -> 11987654321
    expect(formatarTelefone("119876543" + "21")).toBe("(11) 98765-4321");
  });
});
