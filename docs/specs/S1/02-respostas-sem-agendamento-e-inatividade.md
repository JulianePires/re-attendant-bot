# S1-02 · Respostas sem agendamento e inatividade no totem de teste

**Sprint:** S1 · **Estimativa:** 6 h · **Branch:** `feat/s1-respostas-sem-agendamento`
**Rastreabilidade:** UC-001 (A6, E2, E3, E4, E5, E6, E9) · REQ-001 (RF-001.5, RF-001.8, RF-001.9, RF-001.12, RF-001.13, RF-001.19, RF-001.23, RF-001.25, RNF-001.5, RNF-001.6, RN-001.2, RN-001.4)
**Depende de:** S1-01

## Objetivo

Quando a localização não devolve um agendamento para confirmar, o paciente vê o texto do CRM (ou o texto padrão do motivo) com as opções certas para cada caso, e o totem volta sozinho ao início quando ninguém mexe.

## Contexto (o Claude lê só isto)

- `CLAUDE.md`
- `docs/requisitos/REQ-001-checkin-integrado-crm-totem-teste.md` (tabela de motivos, RF-001.5, .8, .9, .12, .13, .19, .23, .25)
- `docs/casos-de-uso/UC-001-localizar-agendamento-pelo-telefone.md`
- Os arquivos do check-in criados em S1-01 (fluxo do totem de teste, Server Action de localização e módulo de contrato do CRM)
- `src/components/tablet/KioskInteractionFlow.tsx` (tempo de inatividade e retorno automático do totem atual; só leitura)
- `src/server/actions/atendimento.ts` (`registrarEEntrarNaFila`, para "Entrar na fila pelo nome"; só leitura)

## Referências (context7 / doc oficial)

- Vitest (`vi.useFakeTimers`), Testing Library

## Requisitos

- Erro de negócio (HTTP 200 com `ok: false`) mostra o campo `mensagem` sem alteração. O `motivo` não aparece na tela (RF-001.8).
- `paciente_nao_encontrado`: mostra a `mensagem` e oferece "Tentar outro telefone" e "Voltar ao início" (RF-001.5).
- `fora_da_janela`: mostra a `mensagem` e oferece "Voltar ao início" (RF-001.5).
- `sem_agendamento_agora`: mostra a `mensagem` e oferece "Tentar outro telefone", "Entrar na fila pelo nome" e "Voltar ao início". "Entrar na fila pelo nome" segue o fluxo atual do `/recepcao`: nome e fila normal, sem CRM (RF-001.19).
- `ja_registrado` na localização é sucesso: mostra a tela de chegada registrada, não chama a confirmação e volta ao início em 10 s. Nada é feito na fila local neste card (RF-001.9).
- Motivo conhecido sem `mensagem`: mostra o texto padrão daquele motivo (RF-001.23).
- Motivo fora da tabela (por exemplo, `dados_invalidos`): mostra a `mensagem` quando houver e, sem ela, o texto padrão de impedimento. Oferece "Voltar ao início" e registra o motivo com destaque no log técnico (RF-001.25, RNF-001.6).
- Depois de um erro de negócio, o totem volta sozinho ao início em 20 s (RF-001.12).
- Em qualquer tela que espera ação, 30 s sem toque levam ao início e descartam telefone e dados (RF-001.13).
- Textos padrão (provisórios até Q-13): `telefone_invalido` "Digite o telefone com DDD."; `paciente_nao_encontrado` "Não encontrei nenhum cadastro com esse número."; `fora_da_janela` "Sua consulta de hoje ainda não está no horário de check-in. Por favor, procure a recepção."; `sem_agendamento_agora` "Não encontrei agendamento para agora."; impedimento genérico "Não foi possível continuar seu check-in. Por favor, procure a recepção."; `ja_registrado` "Sua chegada já estava registrada. Aguarde, você será chamado(a) em breve."
- Os registros técnicos não contêm telefone, nome, procedimento nem a chave (RNF-001.5, RNF-001.6).

## Fora de escopo

- Erros técnicos (401, 500, tempo esgotado, rede, resposta fora do contrato): S1-03.
- Chave de acesso e limite de tentativas: S1-04.
- Colocar o paciente na fila local por causa de `ja_registrado` (UC-002, Q-06).
- Urgência no totem de teste (Q-09 parcial).
- Alterar `registrarEEntrarNaFila` ou o `/recepcao`.

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Respostas da localização sem agendamento para confirmar

  Contexto:
    Dado que o totem de teste está ligado

  Cenário: Paciente não encontrado
    Dado que o CRM responde ao telefone "11900000000" com motivo "paciente_nao_encontrado" e mensagem "Não encontrei nenhum cadastro com esse número."
    Quando o paciente busca pelo telefone "11900000000"
    Então ele vê "Não encontrei nenhum cadastro com esse número."
    E ele vê as opções "Tentar outro telefone" e "Voltar ao início"

  Cenário: Consulta de hoje fora da janela de check-in
    Dado que o CRM responde ao telefone "11911112222" com motivo "fora_da_janela" e mensagem "Sua consulta é às 17:00. O check-in abre às 16:00."
    Quando o paciente busca pelo telefone "11911112222"
    Então ele vê "Sua consulta é às 17:00. O check-in abre às 16:00."
    E ele vê só a opção "Voltar ao início"

  Cenário: Nenhum agendamento para agora, com entrada na fila pelo nome
    Dado que o CRM responde ao telefone "11933334444" com motivo "sem_agendamento_agora" e mensagem "Não encontrei agendamento para agora."
    Quando o paciente busca pelo telefone "11933334444"
    E escolhe "Entrar na fila pelo nome" e informa o nome "João Pereira"
    Então "João Pereira" entra na fila como chamada normal
    E o CRM não recebe nenhuma confirmação de chegada

  Cenário: Chegada já registrada na localização
    Dado que o CRM responde ao telefone "11955556666" com motivo "ja_registrado" e mensagem "Sua chegada já foi registrada."
    Quando o paciente busca pelo telefone "11955556666"
    Então ele vê a tela de chegada registrada com "Sua chegada já foi registrada."
    E a confirmação de chegada não é chamada
    E depois de 10 segundos o totem volta à tela inicial

  Esquema do Cenário: Motivo conhecido sem mensagem
    Dado que o CRM responde com motivo "<motivo>" e sem mensagem
    Quando o paciente busca pelo telefone "11977778888"
    Então ele vê "<texto padrão>"

    Exemplos:
      | motivo                  | texto padrão                                    |
      | paciente_nao_encontrado | Não encontrei nenhum cadastro com esse número.  |
      | sem_agendamento_agora   | Não encontrei agendamento para agora.           |

  Esquema do Cenário: Motivo fora da tabela
    Dado que o CRM responde com motivo "dados_invalidos" e <mensagem>
    Quando o paciente busca pelo telefone "11977778888"
    Então ele vê "<texto>"
    E ele vê a opção "Voltar ao início"
    E o log técnico registra o motivo "dados_invalidos" como desconhecido, sem o telefone

    Exemplos:
      | mensagem                                                | texto                                                                  |
      | mensagem "Faltou alguma informação para eu concluir."   | Faltou alguma informação para eu concluir.                             |
      | sem mensagem                                            | Não foi possível continuar seu check-in. Por favor, procure a recepção. |

  Cenário: Retorno automático depois de um erro de negócio
    Dado que o paciente vê a mensagem de "paciente_nao_encontrado"
    Quando passam 20 segundos sem toque
    Então o totem volta à tela inicial

  Esquema do Cenário: Inatividade em tela que espera ação
    Dado que o paciente está na tela "<tela>"
    Quando passam 30 segundos sem toque
    Então o totem volta à tela inicial
    E o telefone e os dados do agendamento foram descartados

    Exemplos:
      | tela                         |
      | do telefone                  |
      | de confirmação do agendamento |
```

## Critérios de aceite

- [ ] Os 8 cenários acima passam como testes automatizados.
- [ ] O `motivo` nunca aparece na tela.
- [ ] Os textos padrão estão em um único lugar, fáceis de trocar quando Q-13 for respondida.
- [ ] "Entrar na fila pelo nome" usa o fluxo atual sem alterá-lo, e os testes existentes continuam passando.
- [ ] `pnpm lint`, `pnpm type-check` e `pnpm test run` passam.

## Plano de testes (TDD)

| Cenário                                | Técnica                             | Tipo                                      | Arquivo                                                   |
| -------------------------------------- | ----------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| Paciente não encontrado                | tabela de decisão por motivo        | unit (contrato) e unit (UI)               | teste do módulo de contrato; teste do componente do fluxo |
| Fora da janela                         | tabela de decisão por motivo        | unit (UI)                                 | teste do componente do fluxo                              |
| Sem agendamento agora + fila pelo nome | transição de estado                 | integração (UI + action da fila simulada) | teste do componente do fluxo                              |
| Chegada já registrada                  | tabela de decisão + tempo           | unit (UI com timers falsos)               | teste do componente do fluxo                              |
| Motivo conhecido sem mensagem          | partição de equivalência            | unit                                      | teste do módulo de contrato                               |
| Motivo fora da tabela                  | caso negativo                       | unit (contrato e log)                     | teste do módulo de contrato e do log técnico              |
| Retorno automático em 20 s             | valor limite de tempo (19 s / 20 s) | unit (timers falsos)                      | teste do componente do fluxo                              |
| Inatividade de 30 s                    | valor limite de tempo (29 s / 30 s) | unit (timers falsos)                      | teste do componente do fluxo                              |

## Limites

- Até 20 arquivos. Sem dependência nova.
