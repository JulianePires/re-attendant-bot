import { describe, expect, it } from "vitest";
import {
  MENSAGEM_ERRO_TECNICO,
  MENSAGEM_TELEFONE_INVALIDO,
  falaConfirmacao,
  montarMensagemConfirmacao,
} from "./mensagens";

describe("montarMensagemConfirmacao (Paciente encontra o agendamento de agora)", () => {
  it("monta a mensagem padrão com nome, hora e o profissional informado", () => {
    expect(
      montarMensagemConfirmacao({ primeiroNome: "Maria", hora: "14:00", profissional: "Ana Lima" })
    ).toBe("Maria, seu agendamento é às 14:00 com Ana Lima. Confirme para registrar sua chegada.");
  });

  it("reflete outros valores informados", () => {
    expect(
      montarMensagemConfirmacao({ primeiroNome: "João", hora: "09:30", profissional: "Bia Reis" })
    ).toBe("João, seu agendamento é às 09:30 com Bia Reis. Confirme para registrar sua chegada.");
  });
});

describe("mensagens fixas", () => {
  it("expõe a mensagem de telefone inválido", () => {
    expect(MENSAGEM_TELEFONE_INVALIDO).toBe("Digite o telefone com DDD.");
  });

  it("expõe a mensagem de erro técnico", () => {
    expect(MENSAGEM_ERRO_TECNICO).toBe(
      "Não foi possível concluir seu check-in agora. Por favor, procure a recepção."
    );
  });
});

describe("falaConfirmacao", () => {
  it("contém o primeiro nome", () => {
    expect(falaConfirmacao("Maria")).toContain("Maria");
  });

  it("não contém hora, profissional nem procedimento", () => {
    const fala = falaConfirmacao("Maria");
    expect(fala).not.toContain("Ana Lima");
    expect(fala).not.toContain("14:00");
    expect(fala).not.toContain("Pilates");
  });

  it("não contém dígitos de telefone", () => {
    expect(falaConfirmacao("Maria")).not.toMatch(/\d/);
  });
});
