# 🔄 REFATORAÇÃO: Pacientes → nomePaciente Direto

## 📋 Resumo da Mudança

**Regra de Negócio Crítica**: Pacientes NÃO são mais "Usuários". A tabela `User` (BetterAuth) é estritamente reservada para profissionais e administradores. Os dados do paciente no kiosk são salvos diretamente na tabela `Atendimento`.

---

## ✅ Arquivos Modificados

### 1. **Schema Prisma** (`prisma/schema.prisma`)

- ✅ Removida relação `atendimentos` do modelo `User`
- ✅ Modelo `Atendimento` agora tem `nomePaciente String` direto
- ✅ Removida foreign key `pacienteId`
- ✅ Role padrão alterado para `profissional`

### 2. **Migration** (`prisma/migrations/20260414164441_refactor_paciente_to_nome/migration.sql`)

- ✅ SQL criado com migração de dados segura
- ✅ Copia `user.name` → `atendimento.nomePaciente` antes de remover FK
- ✅ Remove usuários com role `paciente`
- ✅ Altera default da role

### 3. **Server Actions** (`src/server/actions/atendimento.ts`)

- ✅ `registrarEEntrarNaFila()` simplificado — não cria mais User
- ✅ `obterFilaAtiva()` e `obterAtendimentosDoDia()` retornam `nomePaciente` direto
- ✅ Removidas funções obsoletas: `entrarNaFila()`, `chamarUrgencia()`, `entrarNaFilaComValidacao()`
- ✅ `schemaAtendimentoNaFila` atualizado

### 4. **Tipos TypeScript** (`src/types/index.ts`)

- ✅ `Role.PACIENTE` removido (só aceita `ADMIN` e `PROFISSIONAL`)
- ✅ `AtendimentoNaFila` simplificado — campo `nomePaciente: string`
- ✅ Schemas renomeados: `schemaCadastroProfissional`, `schemaEntradaKiosk`

### 5. **Componentes Frontend**

- ✅ `CartaoFila.tsx` — usa `item.nomePaciente`
- ✅ `CartaoHistorico.tsx` — usa `atendimento.nomePaciente`
- ✅ `HistoryTable.tsx` — usa `item.nomePaciente` (coluna CPF removida)

---

## 🚀 Comandos de Execução

### **Passo 1: Backup do Banco (OBRIGATÓRIO)**

```bash
# PostgreSQL local
pg_dump -U postgres -d nome_do_banco > backup_antes_refatoracao_$(date +%Y%m%d_%H%M%S).sql

# Ou com Docker
docker exec postgres_container pg_dump -U postgres nome_do_banco > backup_antes_refatoracao_$(date +%Y%m%d_%H%M%S).sql
```

### **Passo 2: Aplicar a Migration**

```bash
# Opção 1: Ambiente de desenvolvimento (aplica direto sem migration history)
pnpm prisma db push

# Opção 2: Produção (recomendado - cria migration history)
pnpm prisma migrate deploy
```

### **Passo 3: Regenerar Prisma Client**

```bash
pnpm prisma generate
```

### **Passo 4: Verificar Build**

```bash
# TypeScript check
pnpm tsc --noEmit

# Build completo
pnpm build
```

---

## 📊 Exemplo de Retorno Simplificado (TypeScript)

### **ANTES** (com relação User)

```typescript
{
  id: "clx123",
  pacienteId: "usr456",
  paciente: {
    id: "usr456",
    name: "João Silva"
  },
  tipoChamada: "normal",
  status: "aguardando",
  criadoEm: Date,
  finalizadoEm: null
}
```

### **DEPOIS** (nomePaciente direto)

```typescript
{
  id: "clx123",
  nomePaciente: "João Silva",
  tipoChamada: "normal",
  status: "aguardando",
  criadoEm: Date,
  finalizadoEm: null
}
```

---

## 🔥 Action Kiosk Simplificada

**ANTES** (criava User)

```typescript
export async function registrarEEntrarNaFila(dados: { nome: string; tipoChamada: TipoChamadaValue }) {
  const paciente = await prisma.user.create({
    data: { name: dados.nome, role: "paciente", ... }
  });

  const atendimento = await prisma.atendimento.create({
    data: { pacienteId: paciente.id, tipoChamada: dados.tipoChamada }
  });

  return atendimento;
}
```

**DEPOIS** (salva direto)

```typescript
export async function registrarEEntrarNaFila(dados: {
  nome: string;
  tipoChamada: TipoChamadaValue;
}) {
  const atendimento = await prisma.atendimento.create({
    data: {
      nomePaciente: dados.nome.trim(),
      tipoChamada: dados.tipoChamada,
      status: "aguardando",
    },
  });

  await criarNotificacoesParaEquipe({ nomePaciente: dados.nome, tipoChamada: dados.tipoChamada });

  return atendimento;
}
```

---

## ⚠️ Pontos de Atenção

1. **Dados Históricos**: A migration copia automaticamente `user.name` → `atendimento.nomePaciente` antes de remover a FK
2. **Usuários Paciente**: Todos os registros com `role = "paciente"` serão **deletados permanentemente**
3. **Frontend**: Componentes agora leem `nomePaciente` direto (sem nested `paciente.name`)
4. **Queries**: Todas as queries removeram o `include: { paciente: true }`

---

## 🧪 Testes Recomendados

```bash
# 1. Testar entrada na fila (Kiosk)
# Verificar que cria atendimento sem criar User

# 2. Testar dashboard
# Verificar que Fila Ativa e Histórico carregam corretamente

# 3. Verificar notificações
# Confirmar que profissionais recebem notificações

# 4. Testar finalizar atendimento
# Deve funcionar normalmente
```

---

## 🔄 Rollback (Se Necessário)

```bash
# Restaurar backup
psql -U postgres -d nome_do_banco < backup_antes_refatoracao_TIMESTAMP.sql

# Reverter para o schema anterior via Git
git checkout HEAD~1 -- prisma/schema.prisma
pnpm prisma db push
pnpm prisma generate
```

---

## 📝 Checklist Final

- [ ] Backup do banco criado
- [ ] Migration aplicada com sucesso
- [ ] Prisma Client regenerado
- [ ] Build TypeScript sem erros
- [ ] Kiosk registra atendimentos corretamente
- [ ] Dashboard exibe fila com `nomePaciente`
- [ ] Histórico carrega sem erros
- [ ] Notificações funcionando

---

**Data da Refatoração**: 14 de abril de 2026  
**Versão**: 1.0.0 (Separação User ↔ Atendimento)
