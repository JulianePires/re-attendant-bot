# 0001 · Autorização do totem de teste por cookie assinado e limite de buscas em memória

**Status:** Aceita · **Data:** 2026-11-26
**Motivada por:** REQ-001 / RNF-001.4, RNF-001.1 · spec S1-04

## Contexto

O totem de teste (`/recepcao-crm`) roda em produção, é público por natureza (tablet sem login) e consulta um CRM com dados de pacientes. Só tablets da clínica podem usá-lo, e um mesmo tablet não pode fazer mais de 10 buscas por minuto. O `proxy.ts` atual não cobre as rotas do totem e compara rotas por prefixo.

## Decisão

- **Ativação por tela, não por URL:** em `/recepcao-crm/ativar` alguém da clínica digita a chave (`CRM_CHECKIN_ACCESS_KEY`, mínimo 32 caracteres), enviada no corpo de uma Server Action. A chave nunca passa pela URL, histórico ou logs de requisição.
- **Cookie de dispositivo assinado:** `totem_crm_acesso = <id aleatório do dispositivo>.<HMAC-SHA256(chave, id)>`, `httpOnly`, `sameSite=lax`, `secure` em produção, `path=/recepcao-crm`, 400 dias. O cookie não contém a chave; trocar a chave desautoriza todos os tablets. Comparações com `timingSafeEqual` sobre resumos SHA-256.
- **Autorização na página e nas Server Actions, não no proxy:** `/recepcao-crm` sem autorização chama `notFound()` e a action de localização recusa sem consultar o CRM. O `proxy.ts` não muda.
- **Limite em memória, por instância:** janela fixa de 60 s, 10 buscas por id de dispositivo, contando só as buscas que chegariam ao CRM.

## Alternativas descartadas

- Chave na URL (`?chave=`): mais simples, mas a chave ficaria nos logs de requisição da Vercel e no histórico do tablet (RNF-001.1).
- Guardar a própria chave no cookie: vazar o cookie vazaria a chave, e o limite não seria por dispositivo.
- Autorizar no `proxy.ts`: exigiria mudar o `matcher` e conviver com o `matchRoute` por prefixo, com risco para `/recepcao`; a página e a action já precisam conferir de qualquer forma.
- Limite compartilhado (Redis/Upstash ou firewall/rate limiting da Vercel): adiado. É o correto para várias instâncias, mas exige infraestrutura nova para um teste com poucos tablets.

## Consequências

- Na Vercel cada instância conta separado: o limite é de melhor esforço e pode chegar a 10 × número de instâncias por minuto.
- Rotacionar `CRM_CHECKIN_ACCESS_KEY` desautoriza todos os tablets; cada um precisa passar pela ativação de novo.
- A tela de ativação não tem limite de tentativas; a força bruta é inviável por causa do mínimo de 32 caracteres.
- **Gatilho de revisão:** promover o totem integrado para o `/recepcao`, mais de um ou dois tablets em uso, ou sinais de abuso nos logs → adotar limite compartilhado (Redis ou firewall da Vercel).

## Fonte

- Next.js: `cookies()` (gravar só em Server Action ou Route Handler) — https://nextjs.org/docs/app/api-reference/functions/cookies
- Node.js: `crypto.timingSafeEqual` — https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- Chrome limita a validade de cookies a 400 dias — https://developer.chrome.com/blog/cookie-max-age-expires
