# S1-05 · Confirmar a chegada no CRM pelo totem de teste

**Sprint:** S1 · **Estimativa:** 8 h · **Branch:** `feat/s1-confirmar-chegada`
**Rastreabilidade:** UC-002 (fluxo principal passos 1–4, 6 e 7; A1 sem a fila; A2; E1–E7; E9 no CRM; E10) · REQ-001 (RF-001.4, RF-001.6, RF-001.7, RF-001.8, RF-001.9, RF-001.10, RF-001.11, RF-001.12, RF-001.21, RF-001.23, RF-001.25, RNF-001.1, RNF-001.2, RNF-001.3, RNF-001.5, RNF-001.6, RNF-001.7, RNF-001.9, RN-001.2, RN-001.4, RN-001.5)
**Depende de:** S1-01 a S1-04

## Objetivo

Na tela de confirmação, o paciente toca em "Confirmar chegada" e o totem registra a chegada no CRM para a consulta localizada nesta interação, mostrando a mensagem do CRM. A fila local fica para o S1-06.

## Contexto (o Claude lê só isto)

- `CLAUDE.md`
- `docs/requisitos/REQ-001-checkin-integrado-crm-totem-teste.md` (contrato do CRM: `POST /agenda/confirmar`; tabela de motivos; RF e RNF citados)
- `docs/casos-de-uso/UC-002-confirmar-chegada-a-consulta.md`
- `docs/adr/0001-autorizacao-do-totem-de-teste.md`, `docs/adr/0002-sem-nova-tentativa-na-localizacao.md`
- `src/lib/crm/contrato.ts`, `src/lib/crm/client.ts`, `src/lib/crm/log.ts`, `src/lib/crm/mensagens.ts`, `src/lib/crm/acesso.ts`, `src/lib/crm/config.ts`
- `src/server/actions/checkin-crm.ts` e o teste
- `src/components/tablet/checkin/KioskCheckinFlow.tsx` e o teste
- `src/lib/crm/__fixtures__/localizar.ts`

## Referências (context7 / doc oficial)

- Node.js `crypto` (`createCipheriv` com `aes-256-gcm`, `hkdfSync`)
- Next.js Server Actions

## Requisitos

- A localização (S1-01) passa a devolver, junto com o agendamento exibido, um **comprovante opaco** do agendamento. Ele é cifrado no servidor e o dispositivo não consegue ler o `consulta_id` nem o nome completo dentro dele (RNF-001.3). Vale por 5 min e só para o dispositivo autorizado que fez a busca (RNF-001.2).
- "Confirmar chegada" chama uma nova Server Action com o comprovante. Ela confere a flag, a autorização do dispositivo (ADR 0001), a validade e a origem do comprovante. Só então chama `POST /agenda/confirmar` com `{ "consulta_id": "..." }` e o `x-api-key`.
- Comprovante expirado, adulterado, de outro dispositivo ou ausente: a confirmação é recusada **sem chamar o CRM**, e o paciente vê a mensagem padrão de erro técnico (E5).
- Enquanto registra, a tela mostra "Registrando sua chegada..." e bloqueia novos toques. Dois toques geram uma única chamada (E1).
- Sucesso `{ ok: true, status: "realizada", mensagem }`: tela de chegada registrada com a `mensagem` do CRM, voz sem telefone nem procedimento, volta ao início em 10 s e descarta os dados (passos 6 e 7).
- `ja_registrado` na confirmação é **sucesso** (A1, RF-001.9): mesma tela, com a `mensagem` do CRM ou o texto padrão de chegada já registrada.
- `nao_encontrada`: mostra a `mensagem` ("Não encontrei essa consulta.") e só "Voltar ao início", sem nova tentativa (E2, RF-001.10).
- Motivo fora da tabela (ex.: `dados_invalidos`): mostra a `mensagem` ou o texto padrão de impedimento, com "Voltar ao início", e o log registra com destaque (E3, RF-001.25). Sem `mensagem`: texto padrão do motivo (E4, RF-001.23).
- Erro técnico (401, 5xx, tempo esgotado, rede, resposta fora do contrato) na confirmação: mensagem padrão "procure a recepção", ignorando a `mensagem` do corpo, e volta ao início em 15 s (E6, E7). Uma só chamada, sem nova tentativa automática. A confirmação é idempotente no CRM, então o paciente pode tentar de novo.
- Log técnico `crm.confirmar` com operação, categoria, causa, motivo, status HTTP, `ok`, duração e correlação, sem telefone, nome, `consulta_id` nem chave (RNF-001.6).
- O formato do contrato de confirmação fica no mesmo módulo único do CRM (RNF-001.13).

## Fora de escopo

- Colocar o paciente na fila local, migration `consultaId` e E8 (S1-06).
- Escolha entre vários agendamentos (UC-001 A5, Q-02).
- `ja_registrado` na **localização** (UC-001 A6, já feito no S1-02).
- Mudanças em `/recepcao`, `/tv`, `/monitor` e `/adm`.

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Confirmar a chegada no CRM

  Contexto:
    Dado que o tablet da recepção está autorizado no totem de teste
    E que Maria localizou agora a consulta das "14:00" com "Ana Lima"

  Cenário: Chegada confirmada
    Dado que o CRM confirma a chegada com status "realizada" e mensagem "Obrigado, Maria! Sua chegada foi registrada. Aguarde, você será chamado(a) em breve."
    Quando Maria toca em "Confirmar chegada"
    Então o CRM recebe a confirmação da consulta localizada
    E ela vê "Obrigado, Maria! Sua chegada foi registrada. Aguarde, você será chamado(a) em breve."
    E depois de 10 segundos o totem volta à tela inicial

  Cenário: Chegada já registrada na confirmação
    Dado que o CRM responde à confirmação com motivo "ja_registrado" e mensagem "Sua chegada já foi registrada."
    Quando Maria toca em "Confirmar chegada"
    Então ela vê a tela de chegada registrada com "Sua chegada já foi registrada."

  Cenário: Dois toques seguidos em Confirmar chegada
    Quando Maria toca duas vezes seguidas em "Confirmar chegada"
    Então o CRM recebe uma única confirmação

  Cenário: Consulta não encontrada na confirmação
    Dado que o CRM responde à confirmação com motivo "nao_encontrada" e mensagem "Não encontrei essa consulta."
    Quando Maria toca em "Confirmar chegada"
    Então ela vê "Não encontrei essa consulta."
    E ela vê só a opção "Voltar ao início"

  Esquema do Cenário: Motivo fora da tabela ou sem mensagem na confirmação
    Dado que o CRM responde à confirmação com motivo "<motivo>" e <mensagem>
    Quando Maria toca em "Confirmar chegada"
    Então ela vê "<texto>"

    Exemplos:
      | motivo          | mensagem                                              | texto                                                                    |
      | dados_invalidos | mensagem "Faltou alguma informação para eu concluir." | Faltou alguma informação para eu concluir.                               |
      | dados_invalidos | sem mensagem                                          | Não foi possível continuar seu check-in. Por favor, procure a recepção.   |
      | nao_encontrada  | sem mensagem                                          | Não encontrei essa consulta.                                             |

  Esquema do Cenário: Comprovante do agendamento recusado
    Dado que o comprovante do agendamento <situacao>
    Quando a confirmação de chegada é pedida
    Então a confirmação é recusada com "Não foi possível concluir seu check-in agora. Por favor, procure a recepção."
    E o CRM não recebe nenhuma confirmação

    Exemplos:
      | situacao                                         |
      | foi emitido há mais de 5 minutos                 |
      | foi adulterado                                   |
      | foi emitido para outro tablet                    |
      | não foi enviado                                  |

  Esquema do Cenário: Falha técnica na confirmação
    Dado que a confirmação no CRM <falha>
    Quando Maria toca em "Confirmar chegada"
    Então ela vê "Não foi possível concluir seu check-in agora. Por favor, procure a recepção."
    E depois de 15 segundos o totem volta à tela inicial

    Exemplos:
      | falha                                                   |
      | responde com HTTP 401 e "Só um instante, por favor."    |
      | responde com HTTP 500                                   |
      | não responde em 8 segundos                              |
      | responde HTTP 200 sem o campo "ok"                      |

  Cenário: Registro técnico da confirmação sem dados pessoais
    Quando Maria confirma a chegada
    Então o log técnico registra a operação "confirmar", o status HTTP, a duração e um identificador de correlação
    E o log técnico não contém o telefone, o nome, o identificador da consulta nem a chave de API

  Cenário: O dispositivo não recebe o identificador da consulta
    Quando Maria localiza a consulta
    Então a resposta enviada ao tablet não contém o identificador da consulta nem o nome completo
```

## Critérios de aceite

- [ ] Os 9 cenários acima passam como testes automatizados.
- [ ] O comprovante é cifrado (AES-256-GCM), vale 5 min, é amarrado ao id do dispositivo e não revela `consulta_id` nem nome completo.
- [ ] O contrato de `/agenda/confirmar` está no módulo único do CRM, com fixtures de sucesso, `ja_registrado`, `nao_encontrada` e `dados_invalidos`.
- [ ] Nenhuma confirmação é enviada sem comprovante válido.
- [ ] `/recepcao` e os testes existentes continuam iguais.
- [ ] `pnpm lint`, `pnpm type-check` e `pnpm test run` passam.

## Plano de testes (TDD)

| Cenário                              | Técnica                                                         | Tipo                                             | Arquivo                               |
| ------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| Chegada confirmada                   | caminho feliz com fixture                                       | integração (action + fetch simulado) e unit (UI) | teste da action; teste do fluxo       |
| Já registrada                        | tabela de decisão por motivo                                    | unit (contrato) e integração                     | teste do contrato; teste da action    |
| Dois toques                          | caso negativo                                                   | unit (UI)                                        | teste do fluxo                        |
| Não encontrada                       | tabela de decisão                                               | integração e unit (UI)                           | teste da action; teste do fluxo       |
| Motivo fora da tabela / sem mensagem | partição de equivalência                                        | unit e integração                                | teste do contrato; teste da action    |
| Comprovante recusado                 | tabela de decisão (expirado, adulterado, outro tablet, ausente) | unit (comprovante) e integração                  | teste do comprovante; teste da action |
| Falha técnica                        | tabela de decisão (status × corpo) + valor limite de tempo      | unit (cliente) e unit (UI)                       | teste do cliente; teste do fluxo      |
| Log sem dados pessoais               | caso de segurança                                               | integração                                       | teste da action e do log              |
| Dispositivo sem `consulta_id`        | caso de segurança                                               | integração                                       | teste da action                       |

## Limites

- Até 20 arquivos. Sem dependência nova. A forma de guardar o `consulta_id` entre localizar e confirmar vai para ADR.
