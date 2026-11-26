# REQ-001 · Check-in de paciente agendado integrado ao CRM, no totem (versão de teste)

**Status:** Rascunho · **Prioridade (MoSCoW):** Must · **Origem:** pedido da cliente; especificação técnica do CRM (2026-11-26); decisões da usuária (2026-11-26); verificação na API real com chamadas que não alteram nada (2026-11-26); análise prévia validada contra o código · **Data:** 2026-11-26

> **Legenda de procedência** (vale para todos os itens abaixo)
>
> - **[C]** confirmado: pedido da cliente, especificação, decisão da usuária ou comportamento observado na API.
> - **[V]** observado na API real, mas fora da especificação.
> - **[S]** suposição; precisa de validação.
> - **[P]** pendente de decisão da cliente; o item só vale se a resposta for "sim".

## Pedido original (resumido)

Hoje o paciente faz check-in no totem (`/recepcao`) e entra numa fila para ser atendido. Um CRM faz os agendamentos e controla a presença, por meio de dois endpoints: um localiza o agendamento pelo telefone (janela de 1h antes a 1h depois) e outro registra a chegada (idempotente). Erro de negócio vem com HTTP 200 e `ok: false`. Erro técnico (401/500) mostra uma mensagem genérica orientando a procurar a recepção. A versão integrada deve ficar em um endereço de teste, sem afetar o ambiente atual, para a cliente testar em produção.

## Contrato do CRM

### Especificado [C]

- **Serviço:** funções do Supabase em `https://iqzyjjsevwhybdocathq.supabase.co/functions/v1/agenda/...`.
- **Autenticação:** as duas chamadas levam o header `x-api-key` com a chave de API (fornecida pela cliente, guardada como segredo do servidor) e `Content-Type: application/json`. A chave não é registrada em nenhum documento.
- **Localizar** (só leitura): `POST .../agenda/localizar`, body `{ "telefone": "11987654321" }`.
  - Telefone com DDD, 10 ou 11 dígitos (com ou sem o 9), com ou sem o `55` na frente.
  - Considera só as consultas de **hoje**, de 1h antes a 1h depois do horário marcado. A janela é aplicada pelo CRM.
  - Sucesso: `{ ok: true, consulta_id, nome, primeiro_nome, hora: "14:00", profissional, procedimento, mensagem }`. A especificação mostra um único objeto.
- **Confirmar** (marca como Atendido): `POST .../agenda/confirmar`, body `{ "consulta_id": "..." }`.
  - Sucesso: `{ ok: true, status: "realizada", mensagem }`.
  - Repetir a chamada não marca duas vezes e devolve `ja_registrado`.
- **Erro de negócio:** HTTP 200 com `{ ok: false, motivo, mensagem }`. O texto para o paciente é `mensagem`. **Não existe o campo `situacao`**: o pedido original chamava esse texto de "situação".
- **Erro técnico:** HTTP 401 (chave ausente ou inválida) ou 500.

### Verificado na API real em 2026-11-26 (chamadas que não alteram nada)

| Chamada                                          | HTTP                   | `motivo`                                  | `mensagem` recebida                                               |
| ------------------------------------------------ | ---------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| localizar `{"telefone":"123"}`                   | 200                    | `telefone_invalido`                       | "Digite o telefone com DDD."                                      |
| localizar `{}` (sem telefone)                    | 200                    | `telefone_invalido`                       | "Digite o telefone com DDD."                                      |
| localizar com telefone inexistente, com e sem 55 | 200                    | `paciente_nao_encontrado`                 | "Não encontrei nenhum cadastro com esse número."                  |
| confirmar com UUID inexistente                   | 200                    | `nao_encontrada`                          | "Não encontrei essa consulta."                                    |
| confirmar com `consulta_id` que não é UUID       | 200                    | `dados_invalidos` **[V] não documentado** | "Faltou alguma informação para eu concluir."                      |
| qualquer chamada sem `x-api-key`                 | **401 com corpo JSON** | `token_ausente` **[V]**                   | "Não consegui acessar a agenda agora. Só um instante, por favor." |
| qualquer chamada com chave inválida              | **401 com corpo JSON** | `token_invalido` **[V]**                  | igual à de `token_ausente`                                        |

Conclusões:

- **[C]** Todo erro, inclusive o 401, segue o formato `{ ok:false, motivo, mensagem }`.
- **[V]** O `consulta_id` é um UUID.
- **[C]** A `mensagem` do 401 ("Só um instante") não orienta o paciente a procurar a recepção. Por isso o erro técnico é identificado pelo **status HTTP**, e o corpo é ignorado (RF-001.11).

**Ainda não verificado** (vai para o teste com os registros de teste, Q-04): resposta de sucesso real da localização e da confirmação, resposta com mais de um agendamento, `fora_da_janela`, `sem_agendamento_agora`, `ja_registrado` (na confirmação e na localização) e HTTP 500.

### Tabela de motivos

| `motivo`                          | Quando ocorre                                                            | Chamada                        | Tratamento no totem                                        | Procedência                |
| --------------------------------- | ------------------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------- | -------------------------- |
| `telefone_invalido`               | menos de 10 dígitos ou telefone ausente                                  | localizar                      | erro de negócio: exibe `mensagem` e deixa corrigir         | C (observado)              |
| `paciente_nao_encontrado`         | nenhum cadastro com o número                                             | localizar                      | erro de negócio: exibe `mensagem`                          | C (observado)              |
| `fora_da_janela`                  | há consulta hoje, mas fora da janela de 1h                               | localizar                      | erro de negócio: exibe `mensagem`                          | C (não observado)          |
| `sem_agendamento_agora`           | nenhum agendamento para agora                                            | localizar                      | erro de negócio: exibe `mensagem`                          | C (não observado)          |
| `ja_registrado`                   | chegada já registrada                                                    | confirmar e localizar          | **sucesso**: tela de chegada registrada (RF-001.9)         | C (decisão; não observado) |
| `nao_encontrada`                  | `consulta_id` inexistente                                                | confirmar                      | erro de negócio: exibe `mensagem`                          | C (observado)              |
| `dados_invalidos`                 | dado faltando ou mal formado (por exemplo, `consulta_id` que não é UUID) | confirmar (e talvez localizar) | erro de negócio desconhecido: exibe `mensagem` (RF-001.25) | V                          |
| `token_ausente`, `token_invalido` | sem chave ou chave inválida (HTTP 401)                                   | ambas                          | **erro técnico** por status, ignora a `mensagem`           | V                          |
| qualquer outro                    | —                                                                        | ambas                          | erro de negócio desconhecido (RF-001.25)                   | S                          |

## Problema

O check-in atual não tem vínculo com o agendamento. O paciente digita só o nome, e o CRM, que controla agendamento e presença, não fica sabendo que ele chegou. A presença precisa ser marcada à parte (Q-14). O totem também não confere se há consulta naquele horário. A cliente quer validar a versão integrada em produção sem arriscar o totem em uso.

## Situação atual (verificada no código em 2026-11-26)

| Fato                                                                                                                                                                                       | Onde                                                                                  | Por que importa                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| O totem tem 4 telas: IDLE, HOME, FORM (nome com no mínimo 2 caracteres) e SUCCESS. HOME tem "Avisar Urgente" e "Avisar minha chegada! (Pacientes agendados)".                              | `src/components/tablet/KioskInteractionFlow.tsx`                                      | O botão de chegada já se apresenta como "para agendados", mas não consulta agendamento nenhum.                            |
| A inatividade de 30 s volta ao início, exceto em IDLE e SUCCESS. SUCCESS volta sozinho em 10 s. Toda falha aparece como o mesmo toast genérico.                                            | idem                                                                                  | Esses tempos são a referência para RF-001.12 e RF-001.13. Hoje não existe distinção entre erro de negócio e erro técnico. |
| `registrarEEntrarNaFila` cria `Atendimento` (`aguardando`) e notifica todos os usuários `profissional` e `admin`. Em caso de falha, lança um erro genérico.                                | `src/server/actions/atendimento.ts`                                                   | Se Q-06 for sim, as notificações da equipe vão disparar no check-in integrado.                                            |
| `Atendimento` guarda só nome, tipo, status, datas e `arquivadoTurno`. Não há origem nem vínculo com a consulta.                                                                            | `prisma/schema.prisma`                                                                | Hoje não dá para impedir duplicidade por consulta nem saber quais atendimentos vieram do teste (RF-001.7, RF-001.20).     |
| `obterFilaPublica` e `obterFilaAtiva` listam todos os `aguardando`. O Realtime de `/tv`, `/monitor` e `/adm` escuta INSERT na tabela inteira.                                              | `atendimento.ts`, `src/hooks/useRealtimeQueuePublic.ts`, `useNotificationListener.ts` | Os atendimentos do teste aparecem nas telas reais, com som e voz (Q-07).                                                  |
| O `matcher` do proxy cobre só `/adm`, `/painel`, `/esqueci-a-senha` e `/redefinir-senha`. A entrada `TOTEM` em `FULLY_PUBLIC_ROUTES` nunca é avaliada. A comparação de rota é por prefixo. | `src/proxy.ts`, `src/lib/constants.ts`                                                | Um endereço novo fora do matcher fica público por padrão. Restringir o acesso (RNF-001.4) exige uma decisão explícita.    |
| O README manda copiar `.env.example`, mas esse arquivo não existe.                                                                                                                         | `README.md`                                                                           | Lacuna registrada aqui, fora do escopo.                                                                                   |

## Atores e partes interessadas

- **Paciente com consulta agendada (ator principal):** faz o check-in sozinho. Perde se os dados dele aparecerem em tela pública ou se o check-in falhar sem orientação.
- **Equipe da recepção (ator secundário):** atende quem cai em erro. Deixa de marcar presença manualmente.
- **Profissional de saúde (ator secundário):** chama o paciente pela fila. Isso depende de Q-06.
- **Responsável pelo teste na clínica (ator do UC-003):** homologa a versão usando os registros de teste do CRM.
- **CRM (sistema externo):** fonte da verdade de agendamento e presença.
- **Cliente (clínica, controladora dos dados, decisora):** aprova o escopo, a exibição de dados e a promoção da versão de teste para o totem oficial.

## Requisitos funcionais

- **RF-001.1 [C]:** Na versão de teste, o paciente deve conseguir iniciar o check-in de consulta agendada informando o telefone.
- **RF-001.2 [C]:** O sistema aceita o telefone com DDD (10 ou 11 dígitos, com ou sem o 9), com ou sem o `55` na frente. Com menos de 10 dígitos, o paciente vê "Digite o telefone com DDD." (a `mensagem` de `telefone_invalido`) e pode corrigir. **[S]** O totem pode recusar antes de consultar o CRM, desde que mostre o mesmo texto.
- **RF-001.3 [C]:** Com o agendamento localizado, a tela de confirmação mostra uma **mensagem padrão do totem**, montada a partir dos campos estruturados, e **não** a `mensagem` do CRM. O campo `profissional` é a fonte da verdade (RN-001.9). Exemplo: "Maria, seu agendamento é às 14:00 com Ana Lima. Confirme para registrar sua chegada." **[C: Q-08]** A mensagem usa `primeiro_nome` e **não** mostra o `procedimento`.
- **RF-001.4 [S]:** Antes de registrar a chegada, o paciente confirma que o agendamento é dele. Ele também pode recusar ("não sou eu") e voltar a informar o telefone.
- **RF-001.5 [C]:** Quando a localização terminar em `paciente_nao_encontrado`, `fora_da_janela` ou `sem_agendamento_agora`, o sistema exibe a `mensagem` do CRM. **[S]** O paciente pode tentar outro telefone ou voltar ao início.
- **RF-001.6 [C]:** Com o agendamento confirmado, o sistema registra a chegada no CRM para o `consulta_id` escolhido e exibe a tela de chegada registrada com a `mensagem` de sucesso do CRM.
- **RF-001.7 [C no CRM / S no totem]:** Repetir a confirmação do mesmo agendamento (duplo toque, nova tentativa, novo check-in) não gera uma segunda chegada no CRM nem um segundo paciente na fila local.
- **RF-001.8 [C]:** Em erro de negócio (HTTP 200, `ok: false`), o sistema exibe o campo `mensagem` sem alterá-lo. `motivo` não é exibido. Ele serve para decidir as opções da tela e entra no registro técnico.
- **RF-001.9 [C]:** `ja_registrado` é **sucesso**, tanto na confirmação quanto na localização: o totem mostra a tela de chegada registrada, não uma tela de erro. **[S]** O texto exibido é a `mensagem` devolvida ou, se ela não servir como confirmação, a mensagem padrão de sucesso (Q-13). **[P: Q-06/Q-15]** O efeito na fila local está em RF-001.17.
- **RF-001.10 [C]:** Quando a confirmação devolver `nao_encontrada`, o sistema exibe a `mensagem` ("Não encontrei essa consulta.") e oferece voltar ao início, sem nova tentativa automática.
- **RF-001.11 [C]:** O erro técnico é identificado pelo status HTTP (401, 500 e qualquer outra resposta de erro HTTP), pelo tempo esgotado, pela falha de rede ou por resposta fora do contrato, e **não** pelo campo `ok`. Nesses casos o totem exibe a sua mensagem padrão orientando a procurar a recepção e **ignora** a `mensagem` do corpo: a do 401 diz "Só um instante", o que não orienta o paciente. Texto proposto, a validar em Q-13: "Não foi possível concluir seu check-in agora. Por favor, procure a recepção."
- **RF-001.12 [S]:** Depois de sucesso ou de erro, o totem volta sozinho ao início. Prazos propostos: sucesso em 10 s (igual ao atual), erro de negócio em 20 s, erro técnico em 15 s.
- **RF-001.13 [S]:** Depois de 30 s sem toque em qualquer tela que espera ação, o totem volta ao início e descarta telefone e dados do agendamento.
- **RF-001.14 [S]:** O paciente pode voltar ao início em qualquer tela, exceto durante uma chamada ao CRM.
- **RF-001.15 [C]:** A versão integrada fica em endereço próprio, no mesmo ambiente de produção, e o comportamento de `/recepcao`, `/tv`, `/monitor` e `/adm` não muda.
- **RF-001.16 [S]:** A clínica consegue desativar a versão de teste sem mexer em `/recepcao`. Desativada, ela não fica acessível.
- **RF-001.17 [P: Q-06]:** Um check-in confirmado (inclusive `ja_registrado`) coloca o paciente na fila local como chamada normal, uma única vez, com o nome definido em Q-06.
- **RF-001.18 [P: Q-09]:** Na versão de teste, "urgente" continua com o comportamento atual (nome e fila urgente), sem CRM.
- **RF-001.19 [C: Q-09]:** Quando a localização terminar em `sem_agendamento_agora`, o totem oferece "Entrar na fila pelo nome", que segue o fluxo atual do `/recepcao` (nome e fila normal, sem CRM).
- **RF-001.20 [S]:** A clínica consegue distinguir quais check-ins e atendimentos vieram da versão integrada, para avaliar a homologação.
- **RF-001.21 [S / C: Q-08]:** O totem orienta por voz cada etapa, sem pronunciar telefone nem procedimento. Quando fala o nome, usa só o `primeiro_nome`.
- **RF-001.22 [P: Q-12]:** A versão de teste indica visualmente que é um ambiente de teste.
- **RF-001.23 [C]:** Se uma resposta de erro de negócio de motivo conhecido vier sem `mensagem`, o totem exibe uma mensagem padrão própria daquele motivo. Os textos padrão serão validados em Q-13.
- **RF-001.24 [C]:** Se a localização devolver **mais de um** agendamento próximo do horário atual, o paciente escolhe qual será realizado agora, e só esse tem a chegada registrada. Cada opção mostra a mensagem padrão de RF-001.3. **[P: Q-02]** Falta saber o formato da resposta nesse caso.
- **RF-001.25 [C]:** Erro de negócio com motivo fora da tabela (por exemplo, `dados_invalidos`): o totem exibe a `mensagem` quando houver e, sem ela, uma mensagem padrão genérica de impedimento. O paciente pode voltar ao início, e o motivo fica no registro técnico.

## Requisitos não funcionais (ISO/IEC 25010)

- **RNF-001.1 · Segurança/confidencialidade [C+S]:** A chave de API (`x-api-key`) fica guardada como segredo do servidor **[C]**. Ela não pode chegar ao dispositivo do totem nem aparecer em código-fonte, documentação ou log **[S]**. Verificação: os recursos entregues ao navegador e os logs de um teste completo não contêm a chave.
- **RNF-001.2 · Segurança/integridade [S]:** A chegada só pode ser registrada para um `consulta_id` devolvido pela localização da mesma interação, em até 5 min. Verificação: uma confirmação com `consulta_id` que não veio dessa localização, ou feita depois do prazo, é recusada sem chamar o CRM. Sem essa regra, qualquer pessoa poderia marcar presença de terceiros.
- **RNF-001.3 · Segurança/confidencialidade [S]:** O `consulta_id` e o `motivo` não são expostos ao dispositivo do totem.
- **RNF-001.4 · Segurança/autenticidade, proteção contra abuso [C: Q-10]:** O endereço de teste só pode ser usado por dispositivos autorizados pela clínica: no primeiro acesso, alguém da clínica digita a chave de acesso numa tela de ativação (nunca pela URL), e o dispositivo fica autorizado por 400 dias; trocar a chave desautoriza todos os dispositivos (decisão da usuária, 2026-11-26). A localização tem limite de 10 tentativas por minuto por dispositivo (valor a calibrar com Q-11). Verificação: acesso não autorizado não exibe o totem; a 11ª tentativa no mesmo minuto é recusada com a mensagem padrão de erro técnico.
- **RNF-001.5 · Privacidade (LGPD), minimização e retenção [S]:** Telefone, `nome`, `primeiro_nome`, `hora`, `profissional` e `procedimento` não são gravados no banco nem em logs. Aparecem só na tela durante a interação e são descartados no retorno ao início. A exceção é o nome que entrar na fila, se Q-06 for sim. O procedimento pode revelar condição de saúde (dado sensível, LGPD art. 5º, II), por isso **não** é exibido nem falado no totem (Q-08); na tela e na voz aparece só o `primeiro_nome`. A base legal é definida pela clínica (controladora).
- **RNF-001.6 · Segurança/responsabilização [S]:** Toda chamada ao CRM gera um registro técnico com operação, status HTTP, `ok`, `status`/`motivo`, duração e um identificador de correlação, sem telefone, nome, procedimento nem chave. Um motivo desconhecido, como `dados_invalidos`, é registrado com destaque para acompanhamento. Verificação: inspeção dos logs de um teste completo.
- **RNF-001.7 · Eficiência de desempenho [S, calibrar com Q-11]:** Retorno visual de "processando" em até 300 ms depois do toque. Cada chamada ao CRM é encerrada como erro técnico se passar de 8 s. O tempo entre o toque e o resultado na tela não passa de 10 s.
- **RNF-001.8 · Confiabilidade/tolerância a falhas [C+S]:** 100% das falhas técnicas levam à tela de erro padrão e ao retorno automático ao início. Com o CRM fora do ar, `/recepcao` continua funcionando.
- **RNF-001.9 · Confiabilidade/robustez de contrato [C+S]:** A resposta é classificada primeiro pelo status HTTP. Um HTTP 200 sem `ok`, que não seja JSON, ou com sucesso sem os campos obrigatórios (`consulta_id`, `profissional`, `hora` e o nome) é tratado como erro técnico e nunca exibe dado parcial.
- **RNF-001.10 · Usabilidade/acessibilidade [S]:** Alvos de toque de no mínimo 64 × 64 px. Contraste WCAG 2.2 AA. Dados do agendamento em fonte de no mínimo 24 px. Mensagens de status anunciadas a tecnologias assistivas. O telefone pode ser digitado só por toque, sem depender do teclado virtual do sistema operacional.
- **RNF-001.11 · Usabilidade/eficiência de uso [S]:** Na homologação, pelo menos 9 de 10 participantes concluem o check-in sem ajuda, em até 60 s contados do primeiro toque.
- **RNF-001.12 · Compatibilidade/coexistência [C]:** Os testes automatizados existentes de `/recepcao`, da fila e do Realtime continuam passando, e o comportamento de `/recepcao`, `/tv`, `/monitor` e `/adm` não muda (salvo Q-06 e Q-07).
- **RNF-001.13 · Manutenibilidade/modificabilidade [S]:** Uma mudança no contrato do CRM (endereço, nome de campo, novo `motivo`, formato da resposta com vários agendamentos) deve se limitar a um único ponto do código e às suas fixtures de teste.
- **RNF-001.14 · Portabilidade [S]:** A versão de teste roda no mesmo tablet e navegador do totem atual, em tela cheia e com a tela mantida acesa.

## Regras de negócio

- **RN-001.1 [C]:** Só é elegível para check-in uma consulta de hoje, entre 1h antes e 1h depois do horário marcado. A regra é aplicada pelo CRM. **[S]** O fuso é America/Sao_Paulo (Q-05).
- **RN-001.2 [C]:** A chegada de uma consulta é registrada uma única vez. Uma nova confirmação devolve `ja_registrado`, que o totem trata como chegada já registrada.
- **RN-001.3 [C]:** O agendamento é localizado pelo telefone do cadastro do paciente no CRM.
- **RN-001.4 [C]:** Os textos de sucesso da confirmação e de erro de negócio vêm do campo `mensagem` do CRM. A confirmação dos dados do agendamento usa mensagem padrão do totem (RF-001.3), e o erro técnico usa sempre a mensagem padrão do totem.
- **RN-001.5 [C]:** Se o check-in não puder ser concluído por falha técnica, a recepção atende o paciente presencialmente.
- **RN-001.6 [C]:** Localizar não altera nada no CRM. Só confirmar muda o estado da consulta, para "realizada".
- **RN-001.7 [C]:** O normal é um agendamento por telefone. Se houver mais de um próximo do horário atual, quem decide qual será realizado agora é o paciente.
- **RN-001.8 [C]:** Os testes em produção usam os registros de teste existentes no CRM, e a cliente pode criar mais, não pacientes reais. **[S]** Cada registro de teste só pode ser confirmado uma vez (RN-001.2), então um novo teste de confirmação precisa de um novo registro ou de reset (Q-04).
- **RN-001.9 [C]:** O nome do profissional da consulta é o do campo `profissional`. Um nome citado em `mensagem` não prevalece sobre ele.

## Restrições

- **[C]** O teste acontece em produção, no mesmo domínio do totem atual, sem afetar o ambiente em uso.
- **[C]** O CRM é acessado pelas funções do Supabase descritas no contrato, com chave de API. Expiração e troca da chave estão em Q-11.
- **[S]** A hospedagem atual não tem IP de saída fixo. Se o CRM restringir por IP, isso vira restrição (Q-11).
- LGPD: há dado pessoal (nome, telefone) e potencialmente sensível (procedimento) exibido em local público.

## Premissas (a validar)

- **[S]** O paciente confirma o agendamento antes da marcação (RF-001.4).
- **[S]** A `mensagem` dos motivos ainda não observados está em pt-BR, é curta e não contém dado sensível.
- **[S]** A versão de teste repete a tela inicial, o rosto do robô, a voz e os tempos do totem atual.
- **[S]** O "endpoint de teste" pedido é registrado como premissa de isolamento. O problema é testar com o CRM real sem risco para o totem em uso.

## Perguntas em aberto (por prioridade)

- [ ] **Q-06:** O check-in confirmado (inclusive `ja_registrado`) cria o paciente na fila local (painel, TV, monitor)? Com qual nome (`primeiro_nome`, `nome` ou abreviado) e como chamada normal? Sem isso o profissional não vê o paciente. Muda RF-001.17. Responsável: cliente.
- [ ] **Q-04:** Telefones de teste que cubram cada caso ainda não verificado: sucesso com um agendamento, mais de um agendamento na janela, `fora_da_janela`, `sem_agendamento_agora`, `ja_registrado` (na confirmação e na localização) e, se possível, uma forma de provocar HTTP 500. Também: dá para "resetar" um registro de teste depois de confirmado, ou cada teste exige um registro novo? Responsável: cliente.
- [ ] **Q-02:** Formato da resposta da localização quando há mais de um agendamento: lista, campo adicional, outro motivo? Sem isso não há como implementar RF-001.24. Responsável: fornecedor do CRM.
- [ ] **Q-15:** Quando `ja_registrado` aparece na localização, a resposta traz `nome`/`primeiro_nome` e `consulta_id`? Sem eles o totem mostra "chegada registrada", mas não consegue colocar ou conferir o paciente na fila local (RF-001.17). Responsável: fornecedor do CRM.
- [ ] **Q-07:** Durante o teste, os atendimentos dos registros de teste podem aparecer na fila real, com som e voz na TV? Responsável: cliente.
- [ ] **Q-09 (parcial):** Na versão de teste, "urgente" continua igual, sem CRM? Muda RF-001.18. Responsável: cliente.
- [ ] **Q-17:** O que aparece na TV e no monitor para um paciente vindo do check-in integrado? Depende de Q-06. Responsável: cliente.
- [ ] **Q-16:** `dados_invalidos`, `token_ausente` e `token_invalido` são motivos oficiais? Existe uma lista completa de motivos? Responsável: fornecedor do CRM.
- [ ] **Q-05:** A janela "hoje ±1h" usa o fuso America/Sao_Paulo? Responsável: fornecedor do CRM.
- [ ] **Q-11:** Tempo de resposta típico e limite de requisições do CRM. Restringe por IP? A chave expira, e como é trocada? Calibra RNF-001.4 e RNF-001.7. Responsável: fornecedor do CRM.
- [ ] **Q-13:** Textos padrão do totem: erro técnico, um por motivo para respostas sem `mensagem`, impedimento genérico e sucesso para `ja_registrado`. Quem aprova? Responsável: cliente.
- [ ] **Q-12:** Exibir um selo "ambiente de teste"? Muda RF-001.22. Responsável: cliente.
- [ ] **Q-14:** Quanto tempo dura o teste e qual o critério para promover a versão ao `/recepcao`? Quem marca a presença no CRM hoje, e quanto tempo isso leva (linha de base)? Responsável: cliente.

### Respondidas em 2026-11-26

- **Q-01:** `ja_registrado` é sucesso, na confirmação e na localização (RF-001.9).
- **Q-03:** `profissional` é a fonte da verdade, e a confirmação usa mensagem padrão do totem (RF-001.3, RN-001.9).
- **Q-02 (parcial):** a escolha entre agendamentos fica com o paciente (RF-001.24). Falta o formato da resposta.
- **Q-04 (parcial):** existem registros de teste e a cliente pode criar mais (RN-001.8). Falta cobrir cada caso.
- **Campo do texto de erro:** é `mensagem`; não existe `situacao`.
- **Q-08:** a mensagem de confirmação e a voz usam `primeiro_nome`, sem o procedimento (RF-001.3, RF-001.21, RNF-001.5). A exibição na TV e no monitor passou para Q-17.
- **Q-09 (parcial):** com `sem_agendamento_agora`, o totem oferece "Entrar na fila pelo nome", como no `/recepcao` (RF-001.19). Falta a decisão sobre a urgência.
- **Q-10:** chave de acesso no primeiro acesso do dispositivo e limite de 10 buscas por minuto por dispositivo (RNF-001.4).
- **Escopo do UC-001 até Q-02, Q-06 e Q-15:** a escolha entre vários agendamentos (A5) vira um card separado, a criar quando houver exemplo da resposta. Com `ja_registrado` na localização (A6), o UC-001 só mostra a chegada registrada; o efeito na fila local fica para o UC-002.

## Fora do escopo

- Substituir `/recepcao` pela versão integrada. Isso fica para depois da homologação (Q-14).
- Criar, alterar ou cancelar agendamentos no CRM.
- Login ou cadastro de paciente.
- Mudanças em `/adm`, `/tv` e `/monitor`, salvo o que Q-06 e Q-07 exigirem.
- Remover código morto (`PatientQueueForm.tsx`, `KioskActionButtons.tsx`) e criar `.env.example`.

## Casos de uso derivados

- UC-001 · Localizar meu agendamento pelo telefone
- UC-002 · Confirmar minha chegada à consulta
- UC-003 · Testar o check-in integrado sem afetar o totem em uso

## Rastreabilidade

| Requisito                                                            | UC     |
| -------------------------------------------------------------------- | ------ |
| RF-001.1, .2, .3, .5, .8, .9, .11, .12, .13, .14, .21, .23, .24, .25 | UC-001 |
| RF-001.4, .6, .7, .8, .9, .10, .11, .12, .17, .21, .23, .25          | UC-002 |
| RF-001.15, .16, .18, .19, .20, .22                                   | UC-003 |

## Decisões que pedem ADR

- Como isolar e ativar/desativar a versão de teste no mesmo ambiente de produção (endereço, ativação, controle de acesso), dado que o proxy atual não roda nas rotas do totem.
- Onde guardar os `consulta_id` entre localizar e confirmar (um ou vários), garantindo RNF-001.2 e RNF-001.3 num totem público e sem login.
- Se e como registrar a origem do atendimento e o vínculo com a consulta do CRM no modelo `Atendimento` (RF-001.7, RF-001.17, RF-001.20). Isso altera o schema.
- Política de nova tentativa e tempo-limite nas chamadas ao CRM, considerando a idempotência da confirmação e o limite de duração da hospedagem.
- Onde guardar a chave de API e como trocá-la.
