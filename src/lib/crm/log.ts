import "server-only";

type DadosLocalizacao = {
  categoria: string;
  motivo?: string;
  desconhecido: boolean;
  duracaoMs: number;
  correlacao: string;
};

/**
 * Registro técnico de cada localização no CRM (RNF-001.6), uma linha JSON.
 * Só os campos abaixo saem: nada de telefone, nome, procedimento ou chave (RNF-001.5),
 * mesmo que o chamador passe um objeto maior. Motivo desconhecido vai em `warn`
 * para chamar atenção.
 */
export function registrarLocalizacao(dados: DadosLocalizacao): void {
  const linha = JSON.stringify({
    evento: "crm.localizar",
    categoria: dados.categoria,
    motivo: dados.motivo,
    desconhecido: dados.desconhecido,
    duracaoMs: dados.duracaoMs,
    correlacao: dados.correlacao,
  });

  if (dados.desconhecido) {
    console.warn(linha);
  } else {
    console.info(linha);
  }
}
