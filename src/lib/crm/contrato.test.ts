import { describe, expect, it } from "vitest";
import {
  classificarMotivo,
  interpretarRespostaLocalizar,
  montarRequisicaoLocalizar,
} from "./contrato";
import {
  respostaPacienteNaoEncontrado,
  respostaSucesso,
  respostaTelefoneInvalido,
  respostaTokenInvalido,
} from "./__fixtures__/localizar";

const config = { baseUrl: "https://crm.exemplo.test", apiKey: "chave-de-teste" };

describe("montarRequisicaoLocalizar", () => {
  it("monta a url de localização a partir da base", () => {
    const { url } = montarRequisicaoLocalizar(config, "11999998888");
    expect(url).toBe("https://crm.exemplo.test/agenda/localizar");
  });

  it("não duplica a barra quando a base termina com barra", () => {
    const { url } = montarRequisicaoLocalizar(
      { ...config, baseUrl: "https://crm.exemplo.test/" },
      "11999998888"
    );
    expect(url).toBe("https://crm.exemplo.test/agenda/localizar");
  });

  it("usa POST com os cabeçalhos x-api-key e Content-Type", () => {
    const { init } = montarRequisicaoLocalizar(config, "11999998888");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("x-api-key")).toBe("chave-de-teste");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("envia somente o telefone no corpo JSON", () => {
    const { init } = montarRequisicaoLocalizar(config, "11999998888");
    expect(JSON.parse(String(init.body))).toEqual({ telefone: "11999998888" });
  });
});

describe("interpretarRespostaLocalizar", () => {
  describe("Paciente encontra o agendamento de agora / Contrato: resposta de sucesso da API vira os campos exibidos", () => {
    it("mapeia o sucesso para camelCase usando o profissional do campo", () => {
      const r = interpretarRespostaLocalizar(respostaSucesso.status, respostaSucesso.corpo);
      expect(r).toEqual({
        tipo: "encontrado",
        agendamento: {
          consultaId: "3f1c2b9a-6d4e-4f8a-9b7c-2e5d1a0f8c34",
          primeiroNome: "Maria",
          hora: "14:00",
          profissional: "Ana Lima",
        },
      });
    });

    it("não leva procedimento, nome completo nem mensagem do CRM", () => {
      const r = interpretarRespostaLocalizar(respostaSucesso.status, respostaSucesso.corpo);
      const texto = JSON.stringify(r);
      expect(texto).not.toContain("Pilates");
      expect(texto).not.toContain("Souza");
      expect(texto).not.toContain("Cássio");
    });
  });

  describe("tabela de decisão status x corpo", () => {
    const semCampo = (campo: string) => {
      const copia: Record<string, unknown> = { ...respostaSucesso.corpo };
      delete copia[campo];
      return copia;
    };

    it.each([
      [
        "200 + telefone inválido",
        respostaTelefoneInvalido,
        { tipo: "negocio", motivo: "telefone_invalido", mensagem: "Digite o telefone com DDD." },
      ],
      [
        "200 + paciente não encontrado",
        respostaPacienteNaoEncontrado,
        {
          tipo: "negocio",
          motivo: "paciente_nao_encontrado",
          mensagem: "Não encontrei nenhum cadastro com esse número.",
        },
      ],
      [
        "401 + ok:false token_invalido",
        respostaTokenInvalido,
        { tipo: "tecnico", causa: "status_http" },
      ],
    ])("%s", (_nome, fixture, esperado) => {
      expect(interpretarRespostaLocalizar(fixture.status, fixture.corpo)).toEqual(esperado);
    });

    it.each([400, 404, 500, 503, 199, 300])(
      "status %i com corpo de sucesso é técnico/status_http",
      (status) => {
        expect(interpretarRespostaLocalizar(status, respostaSucesso.corpo)).toEqual({
          tipo: "tecnico",
          causa: "status_http",
        });
      }
    );

    it("200 + ok:false com motivo sem mensagem é negócio com mensagem ausente", () => {
      const r = interpretarRespostaLocalizar(200, { ok: false, motivo: "fora_da_janela" });
      expect(r.tipo).toBe("negocio");
      if (r.tipo === "negocio") {
        expect(r.motivo).toBe("fora_da_janela");
        expect(r.mensagem).toBeUndefined();
      }
    });

    it.each([
      ["null", null],
      ["string", "ok"],
      ["número", 42],
      ["objeto sem ok", { motivo: "x" }],
      ["ok:false sem motivo", { ok: false }],
      ["ok:false com motivo não string", { ok: false, motivo: 7 }],
      ["ok como string", { ...respostaSucesso.corpo, ok: "true" }],
    ])("200 + corpo %s é técnico/resposta_invalida", (_nome, corpo) => {
      expect(interpretarRespostaLocalizar(200, corpo)).toEqual({
        tipo: "tecnico",
        causa: "resposta_invalida",
      });
    });

    it.each(["consulta_id", "primeiro_nome", "hora", "profissional"])(
      "200 + sucesso sem %s é técnico/resposta_invalida",
      (campo) => {
        expect(interpretarRespostaLocalizar(200, semCampo(campo))).toEqual({
          tipo: "tecnico",
          causa: "resposta_invalida",
        });
      }
    );

    it.each(["consulta_id", "primeiro_nome", "hora", "profissional"])(
      "200 + sucesso com %s vazio é técnico/resposta_invalida",
      (campo) => {
        const corpo = { ...respostaSucesso.corpo, [campo]: "" };
        expect(interpretarRespostaLocalizar(200, corpo)).toEqual({
          tipo: "tecnico",
          causa: "resposta_invalida",
        });
      }
    );

    it.each(["consulta_id", "primeiro_nome", "hora", "profissional"])(
      "200 + sucesso com %s não string é técnico/resposta_invalida",
      (campo) => {
        const corpo = { ...respostaSucesso.corpo, [campo]: 123 };
        expect(interpretarRespostaLocalizar(200, corpo)).toEqual({
          tipo: "tecnico",
          causa: "resposta_invalida",
        });
      }
    );
  });
});

describe("classificarMotivo (Respostas sem agendamento / tabela de decisão motivo → categoria)", () => {
  it.each([
    ["telefone_invalido", "telefone_invalido"],
    ["paciente_nao_encontrado", "nao_encontrado"],
    ["fora_da_janela", "fora_da_janela"],
    ["sem_agendamento_agora", "sem_agendamento"],
    ["ja_registrado", "ja_registrado"],
  ])("classifica o motivo %s como %s", (motivo, categoria) => {
    expect(classificarMotivo(motivo)).toBe(categoria);
  });

  it.each([
    ["dados_invalidos", "dados_invalidos"],
    ["nao_encontrada (só existe na confirmação)", "nao_encontrada"],
    ["string vazia", ""],
    ["caixa diferente", "PACIENTE_NAO_ENCONTRADO"],
    ["motivo qualquer", "qualquer_outro"],
  ])("classifica %s como desconhecido", (_nome, motivo) => {
    expect(classificarMotivo(motivo)).toBe("desconhecido");
  });
});

describe("classificarMotivo: nomes do protótipo de objeto", () => {
  it.each(["toString", "__proto__", "constructor"])(
    "treats prototype name %s as desconhecido",
    (motivo) => {
      expect(classificarMotivo(motivo)).toBe("desconhecido");
    }
  );
});
