import "server-only";

import type { CategoriaMotivo, ResultadoLocalizacao } from "./contrato";

type CausaTecnica = Extract<ResultadoLocalizacao, { tipo: "tecnico" }>["causa"];

type DadosLocalizacao = {
  categoria: CategoriaMotivo | "encontrado" | "tecnico";
  causa?: CausaTecnica;
  motivo?: string;
  desconhecido: boolean;
  statusHttp: number | null;
  ok: boolean | null;
  duracaoMs: number;
  correlacao: string;
};

/**
 * Registro técnico de cada localização no CRM (RNF-001.6), uma linha JSON.
 * Só os campos abaixo saem: nada de telefone, nome, procedimento ou chave (RNF-001.5),
 * mesmo que o chamador passe um objeto maior. Erro técnico e motivo desconhecido
 * vão em `warn` para chamar atenção.
 */
export function registrarLocalizacao(dados: DadosLocalizacao): void {
  const linha = JSON.stringify({
    evento: "crm.localizar",
    operacao: "localizar",
    categoria: dados.categoria,
    causa: dados.causa,
    motivo: dados.motivo,
    desconhecido: dados.desconhecido,
    statusHttp: dados.statusHttp,
    ok: dados.ok,
    duracaoMs: dados.duracaoMs,
    correlacao: dados.correlacao,
  });

  if (dados.desconhecido || dados.categoria === "tecnico") {
    console.warn(linha);
  } else {
    console.info(linha);
  }
}
