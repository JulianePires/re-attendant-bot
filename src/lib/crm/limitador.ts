/**
 * Limite de tentativas em janela fixa, em memória (RNF-001.4).
 * Na Vercel cada instância tem a própria contagem, então é um limite de melhor
 * esforço; um limite compartilhado (Redis ou firewall) é decisão de ADR.
 */

type OpcoesLimitador = {
  maximo: number;
  janelaMs: number;
  agora?: () => number;
};

type Janela = { inicio: number; contagem: number };

export function criarLimitador({ maximo, janelaMs, agora = Date.now }: OpcoesLimitador) {
  const janelas = new Map<string, Janela>();

  function removerVencidas(instante: number) {
    for (const [chave, janela] of janelas) {
      if (instante - janela.inicio >= janelaMs) janelas.delete(chave);
    }
  }

  return {
    permitir(chave: string): boolean {
      const instante = agora();
      removerVencidas(instante);

      const janela = janelas.get(chave);
      if (!janela) {
        janelas.set(chave, { inicio: instante, contagem: 1 });
        return true;
      }

      if (janela.contagem >= maximo) return false;
      janela.contagem += 1;
      return true;
    },

    reiniciar() {
      janelas.clear();
    },
  };
}

export const limitadorBuscas = criarLimitador({ maximo: 10, janelaMs: 60_000 });
