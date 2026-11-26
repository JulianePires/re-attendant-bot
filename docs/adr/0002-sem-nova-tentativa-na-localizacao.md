# 0002 · Sem nova tentativa automática e tempo limite único na localização

**Status:** Aceita · **Data:** 2026-11-26
**Motivada por:** REQ-001 / RF-001.11, RNF-001.7, RNF-001.8, RN-001.5 · spec S1-03

## Contexto

Cada busca do totem de teste chama o CRM (funções do Supabase) no momento em que o paciente espera na frente do tablet. O CRM pode demorar, recusar a chave (401) ou falhar (5xx). O paciente não pode ficar esperando, e a recepção é a alternativa presencial (RN-001.5).

## Decisão

- **Uma única chamada por busca, sem nova tentativa automática.** Qualquer erro técnico (status HTTP de erro, tempo esgotado, rede ou resposta fora do contrato) mostra na hora a mensagem "procure a recepção" e volta ao início em 15 s.
- **Tempo limite de 8 s por chamada**, configurável em `CRM_TIMEOUT_MS`, aplicado com `AbortSignal.timeout`. O pior caso fica dentro dos 10 s entre o toque e o resultado (RNF-001.7).
- O log técnico separa a causa (`status_http`, `resposta_invalida`, `sem_resposta`, `tempo_esgotado`) para acompanhar a saúde do CRM sem expor dados pessoais.

## Alternativas descartadas

- Nova tentativa com espera crescente: dobraria o tempo de espera do paciente no pior caso e passaria dos 10 s; para um 401 (chave inválida) nunca ajudaria.
- Nova tentativa só em erro de rede: ganho pequeno para um tablet na rede da clínica; o próprio paciente pode tocar em "Buscar" de novo, e a localização não altera nada no CRM (RN-001.6).
- Tempo limite maior (15–30 s): o paciente desiste antes, e a tela parece travada.

## Consequências

- Falhas momentâneas do CRM aparecem para o paciente como "procure a recepção"; a recepção absorve esses casos.
- Uma nova busca manual é segura, porque localizar não altera nada no CRM. Isto **não** vale para a confirmação de chegada (UC-002), que terá a própria política.
- **Gatilho de revisão:** logs com muitos `tempo_esgotado` ou `sem_resposta` em horário de atendimento, ou o tempo típico de resposta do CRM informado na Q-11 passar de 3 s.

## Fonte

- MDN: `AbortSignal.timeout()` — https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
