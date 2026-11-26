# S1-06 · Paciente com chegada confirmada entra na fila

**Sprint:** S1 · **Estimativa:** 6 h · **Branch:** `feat/s1-fila-apos-checkin`
**Rastreabilidade:** UC-002 (passo 5, A1 na fila, E1, E8, E9 na fila) · REQ-001 (RF-001.7, RF-001.17, RF-001.20, RNF-001.5, RNF-001.6, RNF-001.8, RNF-001.12, RN-001.2)
**Depende de:** S1-05

## Objetivo

Depois que o CRM confirma a chegada (ou responde `ja_registrado`), o paciente entra na fila normal com o nome completo, uma única vez por consulta, e a equipe o vê no painel, na TV e no monitor como os pacientes do `/recepcao`.

## Contexto (o Claude lê só isto)

- `CLAUDE.md`
- `docs/requisitos/REQ-001-checkin-integrado-crm-totem-teste.md` (RF-001.17, RNF-001.5)
- `docs/casos-de-uso/UC-002-confirmar-chegada-a-consulta.md`
- `prisma/schema.prisma` e `prisma/migrations/`
- `src/server/actions/atendimento.ts` e o teste
- `src/server/actions/checkin-crm.ts` e o teste (action de confirmação do S1-05)
- `src/components/tablet/checkin/KioskCheckinFlow.tsx` e o teste

## Referências (context7 / doc oficial)

- Prisma 6: migrations, `@unique` em coluna opcional, erro `P2002`

## Requisitos

- O `Atendimento` ganha uma coluna opcional `consultaId`, única quando preenchida. Os atendimentos do `/recepcao` continuam sem ela (RF-001.7, RF-001.20).
- A migration só adiciona a coluna: nenhum dado existente muda, e o `/recepcao`, a TV, o monitor e o painel funcionam como antes (RNF-001.12).
- Depois de uma confirmação com sucesso ou `ja_registrado`, o sistema coloca o paciente na fila como chamada **normal** com o **nome completo** (`nome`) do CRM e o `consultaId` da consulta. A equipe recebe a notificação de hoje, "Novo paciente na fila" (RF-001.17).
- Se já existe atendimento para essa consulta (duplo toque, nova confirmação, dois totens), nenhum atendimento nem notificação a mais é criado, e o paciente vê a tela de sucesso normalmente (RF-001.7, E1, E9).
- Se a criação na fila falhar depois do CRM confirmar, o paciente vê "Não foi possível concluir seu check-in agora. Por favor, procure a recepção." em vez da tela de sucesso, e o log registra a falha com destaque, sem dados pessoais (E8).
- O nome completo entra no banco só pelo atendimento da fila. Telefone, procedimento e `consulta_id` não vão para log (RNF-001.5, RNF-001.6).

## Fora de escopo

- Mudar a aparência da TV, do monitor ou do painel.
- Guardar outros dados do CRM no atendimento (hora, profissional, procedimento).
- `ja_registrado` na **localização** (UC-001 A6, Q-15): continua só mostrando a chegada registrada.
- Aplicar a migration em produção: é um passo manual de deploy (`pnpm exec prisma migrate deploy`), feito pela usuária.

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Paciente com chegada confirmada entra na fila

  Contexto:
    Dado que Maria Souza localizou a consulta "3f1c2b9a-6d4e-4f8a-9b7c-2e5d1a0f8c34" no totem de teste

  Cenário: Chegada confirmada coloca a paciente na fila
    Dado que o CRM confirma a chegada
    Quando Maria toca em "Confirmar chegada"
    Então "Maria Souza" entra na fila como chamada normal ligada à consulta "3f1c2b9a-6d4e-4f8a-9b7c-2e5d1a0f8c34"
    E a equipe recebe a notificação "Novo paciente na fila" com "Novo Paciente: Maria Souza"
    E ela vê a tela de chegada registrada

  Cenário: Chegada já registrada sem atendimento local
    Dado que o CRM responde à confirmação com motivo "ja_registrado"
    E que não existe atendimento para essa consulta
    Quando Maria toca em "Confirmar chegada"
    Então "Maria Souza" entra na fila uma vez

  Cenário: Confirmação repetida não duplica a fila
    Dado que já existe atendimento aguardando para essa consulta
    Quando a chegada é confirmada de novo
    Então a fila continua com um único atendimento dessa consulta
    E a equipe não recebe uma nova notificação
    E Maria vê a tela de chegada registrada

  Cenário: Duas confirmações ao mesmo tempo
    Quando duas confirmações da mesma consulta chegam juntas à fila
    Então só um atendimento é criado

  Cenário: Falha na fila depois do CRM confirmar
    Dado que o CRM confirma a chegada
    E que a criação na fila falha
    Quando Maria toca em "Confirmar chegada"
    Então ela vê "Não foi possível concluir seu check-in agora. Por favor, procure a recepção."
    E o log técnico registra a falha da fila sem o nome nem o telefone

  Cenário: Totem atual continua igual
    Quando um paciente entra na fila pelo "/recepcao" com o nome "Carlos Lima"
    Então o atendimento é criado sem consulta vinculada
    E a notificação continua "Novo paciente na fila" com "Novo Paciente: Carlos Lima"
```

## Critérios de aceite

- [ ] Os 6 cenários acima passam como testes automatizados.
- [ ] A migration adiciona só a coluna `consultaId` (opcional, única) e não altera dados existentes; o Prisma Client é regenerado.
- [ ] A unicidade vem do banco (índice único); a corrida de duas confirmações é tratada pelo erro de unicidade, sem duplicar.
- [ ] `/recepcao`, TV, monitor e painel continuam iguais, e os testes existentes passam.
- [ ] O passo manual de deploy (`prisma migrate deploy`) está descrito na PR.
- [ ] `pnpm lint`, `pnpm type-check` e `pnpm test run` passam.

## Plano de testes (TDD)

| Cenário                          | Técnica                       | Tipo                         | Arquivo                                              |
| -------------------------------- | ----------------------------- | ---------------------------- | ---------------------------------------------------- |
| Chegada confirmada entra na fila | caminho feliz                 | integração (Prisma simulado) | teste da action da fila; teste da action de check-in |
| Já registrada sem atendimento    | tabela de decisão             | integração                   | teste da action de check-in                          |
| Confirmação repetida             | idempotência                  | integração                   | teste da action da fila                              |
| Duas confirmações juntas         | corrida (erro P2002 simulado) | integração                   | teste da action da fila                              |
| Falha na fila                    | caso negativo                 | integração e unit (UI)       | teste da action de check-in; teste do fluxo          |
| Totem atual igual                | regressão                     | integração                   | teste da action da fila                              |

## Limites

- Até 20 arquivos. Sem dependência nova. A mudança no schema vai para ADR.
