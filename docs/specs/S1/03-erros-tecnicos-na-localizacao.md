# S1-03 · Erros técnicos na localização do agendamento

**Sprint:** S1 · **Estimativa:** 4 h · **Branch:** `feat/s1-erros-tecnicos-localizacao`
**Rastreabilidade:** UC-001 (E7, E8) · REQ-001 (RF-001.11, RF-001.12, RNF-001.1, RNF-001.5, RNF-001.6, RNF-001.7, RNF-001.8, RNF-001.9, RN-001.5)
**Depende de:** S1-01

## Objetivo

Qualquer falha técnica na localização leva o paciente à mensagem padrão "procure a recepção", sem mostrar dado parcial, e o totem volta sozinho ao início.

## Contexto (o Claude lê só isto)

- `CLAUDE.md`
- `docs/requisitos/REQ-001-checkin-integrado-crm-totem-teste.md` (verificação na API, RF-001.11, RNF-001.6 a .9)
- `docs/casos-de-uso/UC-001-localizar-agendamento-pelo-telefone.md`
- Os arquivos do check-in criados em S1-01 (Server Action de localização, cliente e módulo de contrato do CRM, fluxo do totem de teste)

## Referências (context7 / doc oficial)

- `fetch` com `AbortSignal.timeout` (MDN)
- Vitest (`vi.stubGlobal`, `vi.useFakeTimers`)

## Requisitos

- O erro técnico é identificado pelo status HTTP (401, 500 ou qualquer outro status de erro), pelo tempo esgotado (mais de 8 s), pela falha de rede ou por resposta fora do contrato, e **não** pelo campo `ok` (RF-001.11, RNF-001.9).
- Nesses casos o paciente vê "Não foi possível concluir seu check-in agora. Por favor, procure a recepção." O totem **ignora** a `mensagem` do corpo: a do 401 é "Não consegui acessar a agenda agora. Só um instante, por favor." (RF-001.11).
- "Fora do contrato" inclui: resposta que não é JSON, HTTP 200 sem `ok`, e sucesso sem `consulta_id`, `primeiro_nome`/`nome`, `hora` ou `profissional`. Nunca se exibe dado parcial (RNF-001.9).
- Depois do erro técnico, o totem volta sozinho ao início em 15 s (RF-001.12).
- Cada chamada ao CRM gera um registro técnico com operação, status HTTP, `ok`, `motivo`, duração e identificador de correlação, sem telefone, nome, procedimento nem a chave (RNF-001.6, RNF-001.1, RNF-001.5).
- Com o CRM fora do ar, o `/recepcao` continua funcionando (RNF-001.8).

## Fora de escopo

- Nova tentativa automática da localização: a política é decisão de ADR. Neste card não há nova tentativa.
- Erros de negócio (S1-02).
- Chave de acesso e limite de tentativas (S1-04).
- Erros técnicos da confirmação de chegada (UC-002).

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Erros técnicos na localização do agendamento

  Contexto:
    Dado que o totem de teste está ligado

  Cenário: CRM recusa a chave de acesso
    Dado que o CRM responde com HTTP 401, motivo "token_invalido" e mensagem "Não consegui acessar a agenda agora. Só um instante, por favor."
    Quando o paciente busca pelo telefone "11987654321"
    Então ele vê "Não foi possível concluir seu check-in agora. Por favor, procure a recepção."
    E ele não vê "Só um instante, por favor."

  Esquema do Cenário: Outras falhas técnicas
    Dado que a localização no CRM <falha>
    Quando o paciente busca pelo telefone "11987654321"
    Então ele vê "Não foi possível concluir seu check-in agora. Por favor, procure a recepção."
    E nenhum dado de agendamento é exibido

    Exemplos:
      | falha                                                      |
      | responde com HTTP 500                                      |
      | responde com HTTP 503                                      |
      | não responde em 8 segundos                                 |
      | falha por erro de rede                                     |
      | responde HTTP 200 com um corpo que não é JSON              |
      | responde HTTP 200 sem o campo "ok"                         |
      | responde sucesso sem o campo "profissional"                |
      | responde sucesso sem o campo "consulta_id"                 |

  Cenário: Retorno automático depois de um erro técnico
    Dado que o paciente vê a mensagem de erro técnico
    Quando passam 15 segundos sem toque
    Então o totem volta à tela inicial

  Cenário: Registro técnico sem dados pessoais
    Dado que o CRM responde com HTTP 500
    Quando o paciente busca pelo telefone "11987654321"
    Então o log técnico registra a operação "localizar", o status 500, a duração e um identificador de correlação
    E o log técnico não contém "11987654321" nem a chave de API

  Cenário: Totem atual continua funcionando com o CRM fora do ar
    Dado que o CRM não responde
    Quando um paciente usa o "/recepcao" para entrar na fila pelo nome
    Então ele entra na fila normalmente
```

## Critérios de aceite

- [ ] Os 5 cenários acima (12 casos com os exemplos) passam como testes automatizados.
- [ ] A classificação de erro técnico está em um único ponto e é decidida pelo status HTTP antes de olhar o corpo.
- [ ] O tempo limite de 8 s é configurável por variável de ambiente do servidor.
- [ ] `pnpm lint`, `pnpm type-check` e `pnpm test run` passam.

## Plano de testes (TDD)

| Cenário                             | Técnica                              | Tipo                 | Arquivo                                    |
| ----------------------------------- | ------------------------------------ | -------------------- | ------------------------------------------ |
| CRM recusa a chave (401)            | caso negativo com fixture verificada | unit                 | teste do cliente do CRM                    |
| Outras falhas técnicas              | tabela de decisão (status × corpo)   | unit                 | teste do cliente e do módulo de contrato   |
| Retorno automático em 15 s          | valor limite de tempo (14 s / 15 s)  | unit (timers falsos) | teste do componente do fluxo               |
| Registro técnico sem dados pessoais | caso de segurança                    | unit                 | teste do log técnico                       |
| `/recepcao` com o CRM fora do ar    | regressão                            | unit                 | testes existentes do `/recepcao` e da fila |

## Limites

- Até 20 arquivos. Sem dependência nova.
