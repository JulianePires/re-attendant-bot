# <ID> · <título do card>

**Sprint:** <Sx> · **Estimativa:** <h> · **Branch:** `<type>/<sx>-<slug>`
**Rastreabilidade:** UC-NNN (fluxo principal, A1, E1) · REQ-NNN (RF-NNN.1, RNF-NNN.1)

## Objetivo

<uma frase: o que existe depois que o card fecha>

## Contexto (o Claude lê só isto)

- <arquivos do repo>

## Referências (context7 / doc oficial)

- <libs>

## Requisitos

- <comportamento esperado, sem implementação>

## Fora de escopo

- <o que NÃO fazer neste card>

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: <nome>

  Cenário: <caminho feliz — fluxo principal do UC>
    Dado <estado>
    Quando <ação>
    Então <resultado observável>

  Cenário: <exceção E1>
    Dado <estado>
    Quando <ação>
    Então <resultado observável>
```

## Critérios de aceite

- [ ] <verificável>

## Plano de testes (TDD)

| Cenário   | Técnica                                              | Tipo                            | Arquivo   |
| --------- | ---------------------------------------------------- | ------------------------------- | --------- |
| <cenário> | partição / valor limite / tabela de decisão / estado | unit / integração / e2e / banco | <caminho> |

## Limites

- Até <N> arquivos (ver `.nos-ai.json`). Sem dependência nova fora das listadas.
