import "server-only";

import type { CategoriaMotivo, CategoriaMotivoConfirmacao, ResultadoLocalizacao } from "./contrato";

type CausaTecnica = Extract<ResultadoLocalizacao, { tipo: "tecnico" }>["causa"];

type DadosChamadaCrm = {
  operacao: "localizar" | "confirmar";
  categoria: CategoriaMotivo | CategoriaMotivoConfirmacao | "encontrado" | "confirmado" | "tecnico";
  causa?: CausaTecnica;
  motivo?: string;
  desconhecido: boolean;
  statusHttp: number | null;
  ok: boolean | null;
  duracaoMs: number;
  correlacao: string;
};

/**
 * Registro técnico de cada chamada ao CRM (RNF-001.6), uma linha JSON.
 * Só os campos abaixo saem: nada de telefone, nome, procedimento, consulta_id ou chave
 * (RNF-001.5), mesmo que o chamador passe um objeto maior. Erro técnico e motivo
 * desconhecido vão em `warn` para chamar atenção.
 */
export function registrarChamadaCrm(dados: DadosChamadaCrm): void {
  const linha = JSON.stringify({
    evento: `crm.${dados.operacao}`,
    operacao: dados.operacao,
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

/**
 * Falha ao colocar na fila um paciente que o CRM já confirmou (UC-002 E8). Vai em `warn`
 * porque o paciente foi mandado à recepção. Só o código do erro e a correlação saem.
 */
export function registrarFalhaFila(dados: { correlacao: string; codigo?: string }): void {
  console.warn(
    JSON.stringify({
      evento: "fila.entrar",
      resultado: "falha",
      codigo: dados.codigo,
      correlacao: dados.correlacao,
    })
  );
}
