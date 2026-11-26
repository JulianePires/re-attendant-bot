# 0004 · Vínculo do atendimento à consulta do CRM por hash

**Status:** Aceita · **Data:** 2026-11-26
**Motivada por:** REQ-001 / RF-001.7, RF-001.17, RNF-001.3, RNF-001.12 · spec S1-06

## Contexto

Depois que o CRM confirma a chegada, o paciente entra na fila uma única vez por consulta, mesmo com duplo toque, nova confirmação ou dois totens (RF-001.7). Para isso o `Atendimento` precisa guardar a qual consulta pertence. Mas a tabela `atendimento` é lida pela role `anon` (chave pública da TV e do monitor, `INSTRUÇÕES_RLS_TV.md`), inclusive pelo Realtime, e essa leitura alcança todas as colunas. O `consulta_id` não pode ficar exposto (RNF-001.3).

## Decisão

- Coluna opcional `consultaHash` (`TEXT`, índice único) com o **SHA-256 hex** do `consulta_id`. Os atendimentos do `/recepcao` ficam com `NULL`; o Postgres aceita vários `NULL` num índice único.
- A entrada na fila procura pelo hash e só cria se não existir. A corrida entre duas confirmações é resolvida pelo banco: a segunda recebe o erro de unicidade (`P2002`) e é tratada como "já existe".
- O atendimento e as notificações da equipe são criados na mesma transação: ou o paciente entra na fila com a equipe avisada, ou nada é gravado e uma nova confirmação refaz tudo.
- A entrada na fila por consulta fica em um módulo só do servidor (`src/server/fila.ts`), não em Server Action, para não virar um endpoint público.
- A migration só adiciona a coluna e o índice. Em produção ela é aplicada à mão com `pnpm exec prisma migrate deploy` (o build não roda migrations).

## Alternativas descartadas

- Coluna com o `consulta_id` puro: ficaria legível para quem tem a chave pública.
- GRANT por coluna para a role `anon`: exige configuração manual no Supabase, fora das migrations, e é fácil de desfazer sem perceber.
- HMAC com chave em vez de hash simples: o `consulta_id` é um UUID que não dá para adivinhar, então o hash já não revela nada; com chave, trocar a `CRM_CHECKIN_ACCESS_KEY` quebraria a deduplicação.
- Tabela separada de vínculos: mais um modelo e mais uma política de RLS para um único campo.

## Consequências

- A TV e o monitor recebem um hash sem uso para eles; a aparência não muda.
- Quem já tiver um `consulta_id` consegue calcular o hash, mas não ganha nada com isso: o id só tem valor junto com a chave do CRM, que fica no servidor.
- **Gatilho de revisão:** se a política de leitura pública da tabela `atendimento` passar a limitar colunas, ou se o atendimento precisar de mais dados do CRM.

## Fonte

- Prisma: unique constraint em campo opcional e erro `P2002` — https://www.prisma.io/docs/orm/reference/error-reference#p2002
- PostgreSQL: índices únicos tratam `NULL` como distintos — https://www.postgresql.org/docs/current/indexes-unique.html
