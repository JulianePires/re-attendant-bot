# 0003 · Comprovante cifrado do agendamento entre localizar e confirmar

**Status:** Aceita · **Data:** 2026-11-26
**Motivada por:** REQ-001 / RNF-001.2, RNF-001.3, RF-001.6 · spec S1-05

## Contexto

Para confirmar a chegada, o servidor precisa do `consulta_id` que a localização devolveu na mesma interação. O `consulta_id` não pode chegar ao tablet (RNF-001.3), e só pode ser confirmado o agendamento localizado nesta interação, por este tablet, em até 5 min (RNF-001.2). O app roda em funções da Vercel, sem estado entre chamadas e sem Redis.

## Decisão

- A localização devolve ao tablet um **comprovante opaco**: `{ consultaId, nome, primeiroNome, idDispositivo, expiraEm }` cifrado com **AES-256-GCM** (IV aleatório por comprovante, tag de autenticação). O tablet só guarda e devolve esse texto.
- A chave é derivada por **HKDF** da `CRM_CHECKIN_ACCESS_KEY`, com contexto próprio do comprovante. Trocar a chave de acesso invalida os comprovantes junto com as autorizações dos tablets (ADR 0001).
- A confirmação abre o comprovante no servidor e só chama o CRM se ele for autêntico, não tiver expirado (5 min) e tiver sido emitido para o mesmo id de dispositivo do cookie de autorização.
- O nome completo vai no comprovante porque a entrada na fila depois da confirmação (S1-06) precisa dele sem consultar o CRM de novo.
- A confirmação segue a política da ADR 0002: uma chamada, sem nova tentativa automática; ela é idempotente no CRM (`ja_registrado`).

## Alternativas descartadas

- Devolver o `consulta_id` ao tablet e conferir depois: viola RNF-001.3 e permitiria marcar presença de terceiros.
- Guardar o agendamento no servidor (banco ou memória) com um id de sessão: memória não sobrevive entre instâncias da Vercel; banco exigiria tabela, limpeza e migração só para dados de 5 min.
- Assinar (HMAC) sem cifrar: garante integridade, mas o `consulta_id` e o nome ficariam legíveis no tablet.
- Cookie em vez de valor devolvido à tela: funcionaria para um agendamento, mas não para a escolha entre vários (UC-001 A5), em que cada opção precisa do seu comprovante.

## Consequências

- Nenhum estado novo no servidor; o comprovante cresce algumas centenas de bytes na resposta.
- Um comprovante copiado para outro tablet, alterado ou com mais de 5 min é recusado sem chamar o CRM.
- **Gatilho de revisão:** promover o totem integrado para o `/recepcao` com vários dispositivos sem a chave de acesso, ou se a chave de acesso passar a ser trocada com frequência (cada troca invalida comprovantes em andamento).

## Fonte

- Node.js `crypto.createCipheriv` (GCM, `getAuthTag`) e `crypto.hkdfSync` — https://nodejs.org/api/crypto.html
