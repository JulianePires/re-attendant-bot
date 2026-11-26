# UC-001 · Localizar meu agendamento pelo telefone

**Requisitos:** REQ-001 (RF-001.1, RF-001.2, RF-001.3, RF-001.5, RF-001.8, RF-001.9, RF-001.11, RF-001.12, RF-001.13, RF-001.14, RF-001.21, RF-001.23, RF-001.24, RF-001.25) · **Ator principal:** Paciente com consulta agendada · **Atores secundários:** CRM (sistema externo) · **Status:** Aprovado para spec (2026-11-26), exceto A5, que aguarda Q-02

> Procedência dos passos: **[C]** confirmado, **[V]** observado na API real, **[S]** suposição, **[P]** pendente (ver REQ-001).

## Objetivo do ator

Encontrar minha consulta de agora informando só o meu telefone, para avisar que cheguei.

## Pré-condições

- A versão de teste do totem está ativa e acessível no dispositivo (RF-001.15, RF-001.16).
- O paciente tem cadastro no CRM com o telefone que vai informar. Durante o teste, é um registro de teste (RN-001.8).

## Gatilho

O paciente toca em "Tenho consulta agendada" na tela inicial da versão de teste.

## Fluxo principal

1. O paciente escolhe fazer check-in de consulta agendada.
2. O sistema pede o telefone com DDD e orienta por voz, sem pronunciar dados pessoais. [S]
3. O paciente informa o telefone e pede a busca.
4. O sistema mostra que está procurando (em até 300 ms) e bloqueia novas ações. [S]
5. O sistema consulta o CRM pelo telefone. O CRM aplica a janela de hoje, de 1h antes a 1h depois (RN-001.1), e devolve um agendamento com `consulta_id`, `nome`, `primeiro_nome`, `hora`, `profissional` e `procedimento`. [C]
6. O sistema monta e exibe a mensagem padrão de confirmação a partir dos campos estruturados, com `profissional` como fonte da verdade e não a `mensagem` do CRM. Por exemplo: "Maria, seu agendamento é às 14:00 com Ana Lima. Confirme para registrar sua chegada." A mensagem usa o `primeiro_nome` e não mostra o procedimento (Q-08). [C]
7. O caso de uso continua em UC-002 (`<<include>>` da confirmação).

## Fluxos alternativos

- **A1 · Telefone com o 55 na frente, ou com 10 dígitos** (passo 3): o sistema aceita e segue no passo 4. [C]
- **A2 · Paciente corrige o número antes de buscar** (passo 3): nada é enviado ao CRM até ele pedir a busca. [S]
- **A3 · Paciente desiste** (passos 2, 3, 6 ou A5): o paciente toca em "Voltar ao início". O sistema descarta o telefone e os dados exibidos e volta à tela inicial. [S]
- **A4 · "Não sou eu"** (passo 6): o sistema descarta o agendamento exibido e volta ao passo 2 com o campo vazio. [S]
- **A5 · Mais de um agendamento próximo do horário atual** (passo 5): o sistema lista os agendamentos, cada um com a mensagem padrão do passo 6. O paciente escolhe qual será realizado agora, e só esse segue para UC-002 (RF-001.24, RN-001.7). [C] O formato da resposta do CRM depende de Q-02. [P] **Este fluxo fica em um card próprio, a especificar quando houver exemplo da resposta.**
- **A6 · Chegada já registrada** (passo 5, `motivo: ja_registrado`): é sucesso. O sistema mostra a tela de chegada registrada (RF-001.9), não chama a confirmação e volta ao início em 10 s. Neste caso de uso nada é feito na fila local; o efeito na fila fica para o UC-002 (Q-06, Q-15). [C]

## Fluxos de exceção

- **E1 · Telefone ausente ou com menos de 10 dígitos** (passo 3 ou 5, `telefone_invalido`): o paciente vê "Digite o telefone com DDD." e continua no passo 3 para corrigir. [C, observado]
- **E2 · Paciente não encontrado** (passo 5, `paciente_nao_encontrado`): o sistema exibe "Não encontrei nenhum cadastro com esse número." e oferece "Tentar outro telefone" (volta ao passo 2) ou "Voltar ao início". [C, observado / S nas opções]
- **E3 · Consulta hoje, fora da janela** (passo 5, `fora_da_janela`): o sistema exibe a `mensagem` e oferece "Voltar ao início". [C, não observado]
- **E4 · Nenhum agendamento para agora** (passo 5, `sem_agendamento_agora`): o sistema exibe a `mensagem` e oferece "Tentar outro telefone", "Entrar na fila pelo nome" (fluxo atual do `/recepcao`, fila normal, sem CRM) ou "Voltar ao início" (RF-001.19). [C]
- **E5 · Erro de negócio sem `mensagem`** (passo 5): o sistema exibe a mensagem padrão daquele motivo (RF-001.23). [C]
- **E6 · Motivo fora da tabela, como `dados_invalidos`** (passo 5): o sistema exibe a `mensagem` quando houver e, sem ela, a mensagem padrão de impedimento. Oferece "Voltar ao início" e registra o motivo para acompanhamento (RF-001.25, RNF-001.6). [C/V]
- **E7 · HTTP 401** (passo 5, `token_ausente` ou `token_invalido`): erro técnico identificado pelo status. O sistema **ignora** a `mensagem` do corpo ("Só um instante..."), exibe a mensagem padrão "procure a recepção" e volta ao início em 15 s (RF-001.11). [C/V]
- **E8 · HTTP 500, outra resposta de erro HTTP, tempo acima de 8 s, falha de rede ou resposta fora do contrato** (passo 5): o sistema trata como E7 (RNF-001.7, RNF-001.8, RNF-001.9). [C/S]
- **E9 · Inatividade** (passos 2, 3, 6, A5 ou telas de E1 a E6): depois de 30 s sem toque, o sistema volta ao início e descarta telefone e dados. [S]
- **E10 · Excesso de tentativas no dispositivo** (passo 5): depois de 10 buscas no mesmo minuto (RNF-001.4), a busca é recusada sem consultar o CRM e o paciente vê a mensagem padrão de erro técnico. [C]
- **E11 · Dois toques seguidos em "Buscar"** (passo 3): só uma consulta é enviada. [S]
- **E12 · Acesso não autorizado à versão de teste** (antes do passo 1): sem a chave de acesso no primeiro acesso, o totem de teste não é exibido (RNF-001.4). [C]

## Pós-condições

- **Sucesso:** um agendamento do paciente, de hoje e dentro da janela, está identificado (escolhido em A5, quando houver mais de um) e pronto para UC-002. O `consulta_id` fica guardado fora do dispositivo do totem (RNF-001.3). Nada foi alterado no CRM (RN-001.6). No caso A6, o paciente sabe que a chegada já estava registrada.
- **Falha:** nada mudou no CRM nem na fila local. Telefone e dados não foram gravados no banco nem nos logs (RNF-001.5).

## Regras de negócio aplicadas

- RN-001.1, RN-001.2, RN-001.3, RN-001.4, RN-001.5, RN-001.6, RN-001.7, RN-001.9

## Requisitos não funcionais aplicados

- RNF-001.1, RNF-001.3, RNF-001.4, RNF-001.5, RNF-001.6, RNF-001.7, RNF-001.8, RNF-001.9, RNF-001.10, RNF-001.11, RNF-001.14

## Specs derivadas

- [S1-01 · Localizar o agendamento pelo telefone no totem de teste](../specs/S1/01-localizar-agendamento-pelo-telefone.md): fluxo principal, A1, A2, A3, A4, E1, E11
- [S1-02 · Respostas sem agendamento e inatividade](../specs/S1/02-respostas-sem-agendamento-e-inatividade.md): A6, E2, E3, E4, E5, E6, E9 (depende de S1-01)
- [S1-03 · Erros técnicos na localização](../specs/S1/03-erros-tecnicos-na-localizacao.md): E7, E8 (depende de S1-01)
- [S1-04 · Acesso restrito e limite de tentativas](../specs/S1/04-acesso-restrito-e-limite-de-tentativas.md): E10, E12 (depende de S1-01)
- A5 (escolher entre vários agendamentos): card a especificar quando houver exemplo da resposta (Q-02)
