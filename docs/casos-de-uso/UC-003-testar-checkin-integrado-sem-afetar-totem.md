# UC-003 · Testar o check-in integrado sem afetar o totem em uso

**Requisitos:** REQ-001 (RF-001.15, RF-001.16, RF-001.18, RF-001.19, RF-001.20, RF-001.22) · **Ator principal:** Responsável pelo teste na clínica · **Atores secundários:** Equipe da recepção, CRM · **Status:** Rascunho

> Procedência dos passos: **[C]** confirmado, **[V]** observado na API real, **[S]** suposição, **[P]** pendente (ver REQ-001).

## Objetivo do ator

Usar a versão integrada em produção, com o CRM real e registros de teste, e avaliar se ela pode substituir o totem atual, sem afetar os pacientes do totem oficial.

## Pré-condições

- A versão integrada está publicada no mesmo ambiente de produção do totem atual. [C]
- A chave de API do CRM está configurada como segredo do servidor. [C]
- Há registros de teste no CRM, um por caso a verificar, e a cliente pode criar mais (RN-001.8). [C] A cobertura de cada caso depende de Q-04. [P]

## Gatilho

A clínica decide iniciar o período de teste.

## Fluxo principal

1. O responsável ativa a versão de teste. [S]
2. O responsável abre o endereço de teste no dispositivo autorizado (Q-10). [C/P]
3. O sistema exibe o totem integrado, com indicação de ambiente de teste se Q-12 aprovar. [P]
4. O responsável faz o check-in pelos UC-001 e UC-002 com o telefone de um registro de teste, não de paciente real. [C]
5. O sistema registra a chegada no CRM e, conforme Q-06 e Q-07, coloca ou não o paciente de teste na fila local, de forma identificável (RF-001.20). [C/P/S]
6. O responsável repete os passos 4 e 5 até cobrir todos os casos ainda não verificados: sucesso, mais de um agendamento, `fora_da_janela`, `sem_agendamento_agora`, `ja_registrado` na confirmação e na localização e, se houver como provocar, HTTP 500. [C/P]
7. Durante todo o teste, `/recepcao`, `/tv`, `/monitor` e `/adm` continuam se comportando como antes (RF-001.15, RNF-001.12). [C]
8. Ao fim do período, o responsável desativa a versão de teste e o endereço deixa de ficar acessível (RF-001.16). [S]

## Fluxos alternativos

- **A1 · Repetir a confirmação com um registro já confirmado** (passo 6): o resultado esperado é `ja_registrado`, tratado como sucesso (RF-001.9). Um novo teste do caminho de sucesso exige um registro novo ou o reset desse (Q-04). [C/S]
- **A2 · Urgência na versão de teste** (passo 4, se Q-09 aprovar): o paciente escolhe "urgente", informa o nome e entra na fila como urgente, como hoje, sem CRM (RF-001.18). [P]
- **A3 · Paciente sem agendamento** (passo 4, depois de UC-001 E2/E4, se Q-09 aprovar): o paciente informa o nome e entra na fila normal, como hoje (RF-001.19). [P]
- **A4 · Promoção** (depois do passo 8): atendido o critério de Q-14, a clínica pede a substituição do `/recepcao`. Isso fica fora deste REQ e vira um novo requisito. [S]

## Fluxos de exceção

- **E1 · Versão de teste desativada** (passo 2): o endereço não exibe o totem. `/recepcao` não é afetado. [S]
- **E2 · Dispositivo não autorizado** (passo 2): o totem de teste não é exibido (RNF-001.4). [P]
- **E3 · Chave de API ausente ou inválida** (passo 4): o CRM responde 401 (`token_ausente` ou `token_invalido`). O totem mostra a mensagem padrão "procure a recepção", e o registro técnico aponta falha de autenticação sem expor a chave. [V]
- **E4 · CRM fora do ar durante o teste** (passo 4): os check-ins integrados caem em erro técnico, e `/recepcao` continua funcionando (RNF-001.8). [C/S]
- **E5 · Telefone de paciente real usado no teste** (passo 4): isso marca presença real, o que viola RN-001.8. O responsável identifica o caso pelos registros (RF-001.20), e a correção no CRM fica com a cliente. [C/S]
- **E6 · Atendimento de teste aparece na TV ou no painel real** (passo 5): é o esperado se Q-07 for sim. Se for não, configura falha de RF-001.15. [P]
- **E7 · Motivo não documentado aparece no teste** (passo 6, por exemplo, `dados_invalidos`): o totem segue RF-001.25, e o responsável inclui o motivo na lista que vai para a cliente (Q-16). [V]

## Pós-condições

- **Sucesso:** todos os casos da tabela de motivos foram exercitados com registros de teste e estão identificados (RF-001.20) para avaliar a homologação (RNF-001.11). O totem oficial funcionou sem regressão.
- **Falha:** nenhum comportamento de `/recepcao`, `/tv`, `/monitor` ou `/adm` mudou, nenhuma presença de paciente real foi marcada pelo teste e a chave de API não foi exposta.

## Regras de negócio aplicadas

- RN-001.2, RN-001.5, RN-001.8

## Requisitos não funcionais aplicados

- RNF-001.1, RNF-001.4, RNF-001.6, RNF-001.8, RNF-001.11, RNF-001.12, RNF-001.14

## Specs derivadas

- (a criar com `/nos-core:spec UC-003`)
