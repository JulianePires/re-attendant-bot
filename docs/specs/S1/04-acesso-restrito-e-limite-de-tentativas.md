# S1-04 · Acesso restrito e limite de tentativas no totem de teste

**Sprint:** S1 · **Estimativa:** 5 h · **Branch:** `feat/s1-acesso-totem-teste`
**Rastreabilidade:** UC-001 (E10, E12) · REQ-001 (RF-001.15, RF-001.16, RNF-001.1, RNF-001.4, RNF-001.12)
**Depende de:** S1-01

## Objetivo

Só dispositivos autorizados pela clínica abrem o totem de teste, e um mesmo dispositivo não consegue fazer mais de 10 buscas por minuto.

## Contexto (o Claude lê só isto)

- `CLAUDE.md`
- `docs/requisitos/REQ-001-checkin-integrado-crm-totem-teste.md` (RNF-001.4, seção do código atual sobre o proxy)
- `docs/casos-de-uso/UC-001-localizar-agendamento-pelo-telefone.md`
- `src/proxy.ts` (atenção: o `matcher` hoje não cobre as rotas do totem, e `matchRoute` compara por prefixo)
- `src/lib/constants.ts`
- Os arquivos do check-in criados em S1-01 (página do totem de teste e Server Action de localização)

## Referências (context7 / doc oficial)

- Next.js 16: `proxy.ts` (antigo middleware) e `matcher`, `cookies()` de `next/headers`
- Vitest

## Requisitos

- No primeiro acesso, o dispositivo informa a chave de acesso definida pela clínica em variável de ambiente do servidor. Com a chave certa, ele fica autorizado a partir daí, sem precisar repeti-la (RNF-001.4).
- Sem autorização, o endereço do totem de teste responde como página inexistente e não revela que existe (RNF-001.4).
- A autorização vale também para a Server Action de localização: chamada direta sem autorização é recusada sem consultar o CRM.
- A chave de acesso não aparece na URL depois do primeiro acesso nem em logs (RNF-001.1).
- A localização aceita até 10 buscas por minuto por dispositivo. A partir da 11ª no mesmo minuto, a busca é recusada sem consultar o CRM e o paciente vê "Não foi possível concluir seu check-in agora. Por favor, procure a recepção." (RNF-001.4, E10).
- O `/recepcao`, o `/tv`, o `/monitor` e o `/adm` continuam com o mesmo comportamento de acesso (RF-001.15, RNF-001.12).

## Fora de escopo

- Limite de tentativas compartilhado entre instâncias do servidor (Redis ou firewall da Vercel). Neste card o limite é por instância; a alternativa vai para ADR.
- Tela de administração para gerar ou revogar chaves.
- Restringir por IP.

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Acesso restrito ao totem de teste

  Contexto:
    Dado que o totem de teste está ligado com a chave de acesso "chave-da-clinica"

  Cenário: Dispositivo autorizado no primeiro acesso
    Quando o tablet da recepção abre o totem de teste com a chave "chave-da-clinica"
    Então ele vê a tela inicial do totem de teste
    E o endereço exibido não contém a chave
    E nos acessos seguintes ele abre o totem de teste sem informar a chave

  Esquema do Cenário: Acesso sem autorização
    Quando um dispositivo abre o totem de teste <como>
    Então ele vê a página de "não encontrado"

    Exemplos:
      | como                          |
      | sem chave                     |
      | com a chave "chave-errada"    |

  Cenário: Busca chamada diretamente sem autorização
    Quando a localização é chamada por um dispositivo sem autorização com o telefone "11987654321"
    Então a busca é recusada
    E o CRM não é consultado

  Cenário: Limite de buscas por minuto
    Dado que o tablet autorizado fez 10 buscas no último minuto
    Quando ele faz a 11ª busca com o telefone "11987654321"
    Então ele vê "Não foi possível concluir seu check-in agora. Por favor, procure a recepção."
    E o CRM não é consultado

  Cenário: Limite renovado depois de um minuto
    Dado que o tablet autorizado atingiu o limite de 10 buscas
    Quando passa um minuto e ele busca com o telefone "11987654321"
    Então o CRM é consultado

  Cenário: Rotas atuais sem mudança de acesso
    Quando alguém abre o "/recepcao", o "/tv" ou o "/monitor" sem nenhuma chave
    Então as telas abrem como antes
    E o "/adm" continua exigindo login
```

## Critérios de aceite

- [ ] Os 6 cenários acima passam como testes automatizados.
- [ ] A comparação da chave é feita em tempo constante.
- [ ] A autorização do dispositivo não pode ser lida pelo JavaScript da página (cookie `httpOnly`).
- [ ] O valor da chave vem de variável de ambiente do servidor e não está em arquivo versionado.
- [ ] Os testes existentes do proxy e das rotas continuam passando.
- [ ] `pnpm lint`, `pnpm type-check` e `pnpm test run` passam.

## Plano de testes (TDD)

| Cenário                                   | Técnica                                            | Tipo                 | Arquivo                               |
| ----------------------------------------- | -------------------------------------------------- | -------------------- | ------------------------------------- |
| Dispositivo autorizado no primeiro acesso | transição de estado (sem autorização → autorizado) | integração           | teste do proxy                        |
| Acesso sem autorização                    | partição (sem chave / chave errada)                | integração           | teste do proxy                        |
| Busca chamada diretamente sem autorização | caso de segurança                                  | integração           | teste da Server Action de localização |
| Limite de buscas por minuto               | valor limite (10ª / 11ª)                           | unit                 | teste do limitador                    |
| Limite renovado depois de um minuto       | valor limite de tempo                              | unit (timers falsos) | teste do limitador                    |
| Rotas atuais sem mudança                  | regressão                                          | integração           | teste do proxy                        |

## Limites

- Até 20 arquivos. Sem dependência nova.
