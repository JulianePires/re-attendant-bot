# UC-002 · Confirmar minha chegada à consulta

**Requisitos:** REQ-001 (RF-001.4, RF-001.6, RF-001.7, RF-001.8, RF-001.9, RF-001.10, RF-001.11, RF-001.12, RF-001.17, RF-001.21, RF-001.23, RF-001.25) · **Ator principal:** Paciente com consulta agendada · **Atores secundários:** CRM (sistema externo), Equipe da recepção, Profissional de saúde · **Status:** Aprovado para spec (2026-11-26)

> Procedência dos passos: **[C]** confirmado, **[V]** observado na API real, **[S]** suposição, **[P]** pendente (ver REQ-001).

## Objetivo do ator

Avisar a clínica que cheguei para a minha consulta e saber que serei chamado.

## Pré-condições

- O UC-001 identificou nesta interação, há no máximo 5 min, um agendamento (escolhido pelo paciente quando havia mais de um) (RNF-001.2).

## Gatilho

O paciente toca em "Sou eu, confirmar chegada" na tela com a mensagem padrão do agendamento.

## Fluxo principal

1. O paciente confirma que o agendamento exibido é dele. [S]
2. O sistema mostra que está registrando a chegada e desabilita a confirmação até receber resposta. [S]
3. O sistema registra a chegada no CRM para o `consulta_id` do agendamento escolhido. [C]
4. O CRM marca a consulta como "realizada" e devolve `{ ok: true, status: "realizada", mensagem }`. [C]
5. O sistema coloca o paciente na fila local como chamada normal, uma única vez por consulta, com o nome completo (`nome`) do CRM. A equipe é notificada como hoje (RF-001.17). [C]
6. O sistema mostra a tela de chegada registrada com a `mensagem` do CRM e orienta por voz, sem pronunciar procedimento nem telefone. [C/S]
7. Depois de 10 s, o sistema volta sozinho ao início e descarta os dados do agendamento. [S]

## Fluxos alternativos

- **A1 · Chegada já registrada** (passo 4, `ok: false`, `motivo: ja_registrado`): é sucesso (RF-001.9). O sistema garante que o paciente esteja na fila local, sem duplicar (RF-001.7, RF-001.17), e segue no passo 6, mostrando a `mensagem` do CRM ou a mensagem padrão de sucesso (Q-13). [C]
- **A2 · Paciente desiste antes de confirmar** (passo 1): ele toca em "Não sou eu" ou "Voltar ao início" e cai em UC-001 A4 ou A3. Nada é enviado ao CRM. [S]

## Fluxos de exceção

- **E1 · Toque duplo ou nova tentativa** (passos 1 a 3): só um registro de chegada é feito. Se outro chegar ao CRM, ele devolve `ja_registrado` (A1), e o paciente aparece uma única vez na fila local (RF-001.7). [C/S]
- **E2 · Consulta inexistente** (passo 4, `nao_encontrada`): o sistema exibe "Não encontrei essa consulta." e oferece "Voltar ao início", sem nova tentativa nem atendimento local (RF-001.10). [C, observado]
- **E3 · Dados inválidos** (passo 4, `dados_invalidos`, motivo não documentado): o sistema exibe a `mensagem` ("Faltou alguma informação para eu concluir.") e oferece "Voltar ao início". O caso é registrado com destaque, porque indica um `consulta_id` mal formado (RF-001.25, RNF-001.6). [V]
- **E4 · Erro de negócio sem `mensagem`** (passo 4): o sistema exibe a mensagem padrão daquele motivo, ou a de impedimento genérico (RF-001.23, RF-001.25). [C]
- **E5 · Agendamento expirado ou não obtido nesta interação** (passo 3): passados 5 min da localização, ou com um `consulta_id` que não veio dela, a confirmação é recusada sem chamar o CRM. O paciente vê a mensagem padrão de erro técnico e volta ao início (RNF-001.2). [S]
- **E6 · HTTP 401** (passo 3, `token_ausente` ou `token_invalido`): erro técnico pelo status. O sistema ignora a `mensagem` do corpo, exibe a mensagem padrão "procure a recepção" e volta ao início em 15 s. Nenhum atendimento local é criado (RF-001.11, RN-001.5). [C/V]
- **E7 · HTTP 500, tempo esgotado, rede ou resposta fora do contrato** (passo 3): o sistema trata como E6. Como a confirmação é idempotente, uma nova tentativa do paciente não duplica a chegada. A política de nova tentativa automática é decisão de ADR. [C/S]
- **E8 · CRM confirmou, mas falhou a criação na fila local** (passo 5): o paciente não pode ficar sem ser chamado. O sistema exibe a mensagem padrão "procure a recepção" em vez da tela de sucesso e registra a falha com destaque. A chegada continua registrada no CRM; uma nova confirmação devolve `ja_registrado` e tenta de novo a fila, sem duplicar. [C]
- **E9 · Dois totens ou duas pessoas com o mesmo agendamento ao mesmo tempo** (passo 3): o CRM registra uma única chegada. O segundo recebe `ja_registrado` e segue A1. Na fila local o paciente aparece uma vez. [C/S]
- **E10 · Inatividade na tela de confirmação** (antes do passo 1): depois de 30 s, o sistema volta ao início sem registrar nada. [S]

## Pós-condições

- **Sucesso:** a consulta está como "realizada" no CRM, uma única vez. Existe exatamente um atendimento `aguardando` para essa consulta na fila local, com o nome completo do paciente. A tela voltou ao início sem dados do paciente.
- **Falha:** nenhuma chegada foi registrada sem confirmação do paciente ou para `consulta_id` não localizado. Nenhum atendimento local foi criado sem chegada confirmada. Nenhum dado pessoal ficou em log.

## Regras de negócio aplicadas

- RN-001.2, RN-001.4, RN-001.5, RN-001.6, RN-001.7, RN-001.8

## Requisitos não funcionais aplicados

- RNF-001.1, RNF-001.2, RNF-001.3, RNF-001.5, RNF-001.6, RNF-001.7, RNF-001.8, RNF-001.9, RNF-001.10, RNF-001.12

## Specs derivadas

- [S1-05 · Confirmar a chegada no CRM](../specs/S1/05-confirmar-chegada-no-crm.md): passos 1–4, 6 e 7; A1 (sem fila), A2, E1–E7, E9 no CRM, E10
- [S1-06 · Paciente com chegada confirmada entra na fila](../specs/S1/06-paciente-confirmado-entra-na-fila.md): passo 5, A1 na fila, E1, E8, E9 na fila (depende de S1-05)
