# S1-01 · Localizar o agendamento pelo telefone no totem de teste

**Sprint:** S1 · **Estimativa:** 8 h · **Branch:** `feat/s1-localizar-agendamento`
**Rastreabilidade:** UC-001 (fluxo principal, A1, A2, A3, A4, E1, E11) · REQ-001 (RF-001.1, RF-001.2, RF-001.3, RF-001.4, RF-001.14, RF-001.15, RF-001.16, RF-001.21, RNF-001.1, RNF-001.3, RNF-001.5, RNF-001.7, RNF-001.10, RNF-001.12, RNF-001.13, RNF-001.14, RN-001.3, RN-001.6, RN-001.9)

## Objetivo

Existe um endereço de teste do totem, separado do `/recepcao`, onde o paciente informa o telefone, o sistema localiza o agendamento de agora no CRM e mostra a mensagem de confirmação com o primeiro nome, a hora e o profissional.

## Contexto (o Claude lê só isto)

- `CLAUDE.md`
- `docs/requisitos/REQ-001-checkin-integrado-crm-totem-teste.md` (seções "Contrato do CRM", RF, RNF, RN)
- `docs/casos-de-uso/UC-001-localizar-agendamento-pelo-telefone.md`
- `src/app/recepcao/page.tsx` (tela cheia, tela acesa e rosto do robô, para repetir na versão de teste sem alterar o original)
- `src/components/tablet/KioskInteractionFlow.tsx` (estados, voz, tempos e padrão visual do totem atual; só leitura)
- `src/components/tablet/RobotFaceContainer.tsx`
- `src/hooks/useTTS.ts`
- `src/lib/constants.ts` (`APP_ROUTES`)
- `src/lib/email/config.ts` (padrão de configuração por variável de ambiente)
- `src/server/actions/atendimento.ts` (padrão de Server Action; só leitura)
- `src/types/index.ts`

## Referências (context7 / doc oficial)

- Next.js 16: Server Actions, `notFound()`, variáveis de ambiente do servidor
- Zod v3 (`safeParse`)
- Vitest, Testing Library (`@testing-library/react`, `user-event`)

## Requisitos

- O totem de teste fica em um endereço próprio. O `/recepcao` não muda em nada (RF-001.15, RNF-001.12).
- A clínica liga e desliga o totem de teste por configuração. Desligado, o endereço responde como página inexistente (RF-001.16).
- A tela inicial repete a do totem atual (rosto do robô, tela cheia, tela acesa) e oferece "Tenho consulta agendada" (RF-001.1, RNF-001.14).
- O paciente digita o telefone só por toque, num teclado numérico na tela, com alvos de no mínimo 64 × 64 px e máscara `(DD) 9XXXX-XXXX` (RNF-001.10).
- São aceitos 10 ou 11 dígitos, com ou sem o `55` na frente. Com menos de 10 dígitos, o paciente vê "Digite o telefone com DDD." e pode corrigir, sem consulta ao CRM (RF-001.2).
- Nada é enviado ao CRM até o paciente pedir a busca (A2).
- Depois do toque em "Buscar", a tela mostra que está procurando em até 300 ms e bloqueia novas ações. Dois toques seguidos geram uma única consulta (RNF-001.7, E11).
- A consulta ao CRM acontece só no servidor. A chave de API nunca chega ao dispositivo, e o `consulta_id` não é exposto a ele (RNF-001.1, RNF-001.3).
- Com o agendamento localizado, a tela mostra a mensagem padrão do totem: "<primeiro_nome>, seu agendamento é às <hora> com <profissional>. Confirme para registrar sua chegada." Ela usa o campo `profissional`, nunca o nome citado na `mensagem` do CRM, e não mostra o procedimento (RF-001.3, RN-001.9).
- A tela de confirmação oferece "Confirmar chegada", "Não sou eu" e "Voltar ao início". "Não sou eu" volta ao telefone com o campo vazio (RF-001.4, A4).
- "Voltar ao início" existe em todas as telas, exceto durante a consulta, e descarta o telefone e os dados exibidos (RF-001.14, A3).
- A voz orienta cada etapa sem falar o telefone nem o procedimento. Ao falar o nome, usa só o `primeiro_nome` (RF-001.21).
- Telefone e dados do agendamento não são gravados no banco nem em logs (RNF-001.5).
- O formato do contrato do CRM (endereço, campos, cabeçalho) fica concentrado em um único ponto do código (RNF-001.13).

## Fora de escopo

- Registrar a chegada: "Confirmar chegada" é exibido, mas a confirmação é do UC-002 (outra spec).
- Respostas de negócio sem agendamento (`paciente_nao_encontrado`, `fora_da_janela`, `sem_agendamento_agora`, `ja_registrado`) e erros técnicos (S1-02 e S1-03).
- Inatividade de 30 s (S1-02).
- Chave de acesso do dispositivo e limite de tentativas (S1-04).
- Escolha entre vários agendamentos (A5, aguarda Q-02).
- Fila local, urgência, `/tv`, `/monitor` e `/adm`.
- Qualquer alteração em `/recepcao`, `KioskInteractionFlow.tsx` ou `registrarEEntrarNaFila`.

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Localizar o agendamento pelo telefone

  Contexto:
    Dado que o totem de teste está ligado
    E que o CRM tem para o telefone "11987654321" a consulta de hoje às "14:00" com "Ana Lima" para "Maria Souza", de primeiro nome "Maria"

  Cenário: Paciente encontra o agendamento de agora
    Quando Maria escolhe "Tenho consulta agendada" e busca pelo telefone "(11) 98765-4321"
    Então ela vê "Maria, seu agendamento é às 14:00 com Ana Lima. Confirme para registrar sua chegada."
    E ela vê as opções "Confirmar chegada", "Não sou eu" e "Voltar ao início"
    E a tela não mostra o procedimento nem o nome completo

  Esquema do Cenário: Formatos de telefone aceitos
    Quando Maria busca pelo telefone "<digitado>"
    Então o CRM é consultado com o telefone "<enviado>"
    E ela vê a mensagem de confirmação do agendamento

    Exemplos:
      | digitado        | enviado       |
      | 11987654321     | 11987654321   |
      | 5511987654321   | 5511987654321 |
      | 1132654321      | 1132654321    |

  Esquema do Cenário: Telefone com menos de 10 dígitos
    Quando Maria busca pelo telefone "<digitado>"
    Então ela vê "Digite o telefone com DDD."
    E o CRM não é consultado
    E ela continua na tela do telefone para corrigir

    Exemplos:
      | digitado  |
      |           |
      | 119876543 |

  Cenário: Paciente corrige o número antes de buscar
    Quando Maria digita "1198765432", apaga o último dígito e digita "21"
    Então o CRM não foi consultado
    E o campo mostra "(11) 98765-4321"

  Cenário: Paciente diz que o agendamento não é dele
    Dado que Maria vê a mensagem de confirmação do agendamento
    Quando ela escolhe "Não sou eu"
    Então ela volta à tela do telefone com o campo vazio

  Cenário: Paciente desiste e volta ao início
    Dado que Maria vê a mensagem de confirmação do agendamento
    Quando ela escolhe "Voltar ao início"
    Então ela vê a tela inicial do totem de teste
    E o telefone e os dados do agendamento foram descartados

  Cenário: Dois toques seguidos em Buscar
    Quando Maria toca duas vezes seguidas em "Buscar" com o telefone "11987654321"
    Então o CRM é consultado uma única vez

  Cenário: Totem de teste desligado
    Dado que o totem de teste está desligado
    Quando alguém abre o endereço do totem de teste
    Então vê a página de "não encontrado"
    E o "/recepcao" continua funcionando como antes
```

## Critérios de aceite

- [ ] Os 8 cenários acima passam como testes automatizados.
- [ ] A chave de API não aparece em nenhum recurso entregue ao navegador nem em logs (busca pela chave no build do cliente e nos logs de teste).
- [ ] O `consulta_id` não aparece na resposta enviada ao dispositivo.
- [ ] Nenhum arquivo de `/recepcao`, `KioskInteractionFlow.tsx` ou `registrarEEntrarNaFila` foi alterado, e os testes existentes continuam passando.
- [ ] A chave e o endereço do CRM vêm de variáveis de ambiente do servidor, sem prefixo `NEXT_PUBLIC_`, e não há valor real em arquivo versionado.
- [ ] O formato do contrato do CRM está em um único módulo, com testes de fixture.
- [ ] `pnpm lint`, `pnpm type-check` e `pnpm test run` passam.

## Plano de testes (TDD)

| Cenário                                                      | Técnica                              | Tipo                                                  | Arquivo                                                             |
| ------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------- |
| Paciente encontra o agendamento de agora                     | caminho feliz com fixture da API     | integração (Server Action + CRM simulado) e unit (UI) | teste da Server Action de localização; teste do componente do fluxo |
| Formatos de telefone aceitos                                 | partição de equivalência             | unit                                                  | teste da normalização/validação do telefone                         |
| Telefone com menos de 10 dígitos                             | valor limite (0, 9 e 10 dígitos)     | unit                                                  | teste da validação do telefone e do componente                      |
| Paciente corrige o número                                    | transição de estado                  | unit (UI)                                             | teste do componente do fluxo                                        |
| Não sou eu                                                   | transição de estado                  | unit (UI)                                             | teste do componente do fluxo                                        |
| Voltar ao início                                             | transição de estado                  | unit (UI)                                             | teste do componente do fluxo                                        |
| Dois toques em Buscar                                        | caso negativo                        | unit (UI)                                             | teste do componente do fluxo                                        |
| Totem de teste desligado                                     | tabela de decisão (ligado/desligado) | integração                                            | teste da página do totem de teste                                   |
| Contrato: resposta de sucesso da API vira os campos exibidos | fixture da resposta verificada       | unit                                                  | teste do módulo de contrato do CRM                                  |

## Limites

- Até 20 arquivos (padrão do plugin, sem `.nos-ai.json`). Sem dependência nova, salvo `server-only` se necessário para garantir que o cliente do CRM não vá para o navegador.
