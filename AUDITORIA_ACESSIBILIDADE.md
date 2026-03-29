# Documentação de Auditoria e Acessibilidade

## 🔐 Segurança e Auditoria

### 1. Gerenciamento de Sessão

**Arquivo:** `src/lib/auth.ts`

A aplicação utiliza **BetterAuth 1.2.7** com configuração segura de sessão:

- **HttpOnly Cookies** em produção: `useSecureCookies: true`
- **SameSite=Lax**: Previne ataques CSRF mantendo navegação funcional
- **Duração da Sessão**: 30 dias de inatividade total
- **Renovação**: A cada 1 hora de atividade
- **CPF Não Retornado**: Campo `returned: false` para proteger dado sensível

### 2. Middleware de Autenticação

**Arquivo:** `src/middleware.ts`

Implementa proteção de rotas com validação de:

- **Admin Only Routes** (`/painel/usuarios/novo`): Apenas usuários com `role = "admin"`
- **Protected Routes** (`/painel/*`): Requer autenticação
- **Public Routes** (`/esqueci-a-senha`, `/redefinir-senha`): Redireciona autenticados

**Fluxo:**

```
Request → Validar Sessão → Verificar Role → Permitir/Redirecionar
```

### 3. Validação de RBAC

**Roles Implementados:**

- `paciente` - Acesso apenas à fila e agendamentos
- `profissional` - Acesso ao painel, fila, e gerenciamento de atendimentos
- `admin` - Acesso completo (cabeçalho, users, auditoria)

**Configuração:** `src/lib/auth.ts`

```typescript
admin({
  adminRole: "profissional", // Permite acesso ao painel
  defaultRole: "paciente", // Novo usuário = paciente
});
```

### 4. Seed Script com Segurança

**Arquivo:** `prisma/seed.ts`

Cria usuário admin padrão idempotentemente:

```bash
pnpm db:seed
```

**Credenciais Padrão:**

- Email: `admin@clinica.com`
- Senha: `Clinica@2024` (ALTERE EM PRODUÇÃO)

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login em produção.

---

## ♿ Acessibilidade (WCAG 2.1)

### 1. Atributos ARIA Implementados

**Modal Component** (`src/components/common/molecules/Modal.tsx`):

```typescript
role="alertdialog"
aria-modal="true"
aria-labelledby="modal-dialog-title"
aria-describedby="modal-dialog-description"
```

**Botões:**

```typescript
aria-label="Descrição clara da ação"
```

### 2. Validações de Formulário

**Campos Obrigatórios:**

- Labels explícitos com `<label htmlFor="field-id">`
- Mensagens de erro associadas via `aria-describedby`
- Validação em tempo real com Zod

**Exemplo:**

```tsx
<Field>
  <FieldLabel htmlFor="cpf">CPF (Somente Números)</FieldLabel>
  <InputGroup>
    <InputGroupInput id="cpf" {...register("cpf")} />
  </InputGroup>
  {errors.cpf && <FieldError>{errors.cpf.message}</FieldError>}
</Field>
```

### 3. Navegação por Teclado

- ✅ Todos os botões: Tab, Enter/Space
- ✅ Modais: Escape para fechar
- ✅ Dropdowns: Arrow keys para navegação
- ✅ Forms: Tab order lógico

### 4. Contraste de Cores

**Design System Dark (Zinc):**

- Texto: `text-zinc-100` (100% contrast com uz-950)
- Inputs: `bg-zinc-900 border-zinc-700`
- Hover: `text-violet-400` (3:1 WCAG AA)

### 5. Validação de Dados Sensíveis

**CPF:**

- Validação matemática (Módulo 11) em `src/lib/validations/schemas.ts`
- Função: `isValidCPF(cpf: string): boolean`
- Explica problemas específicos (dígito inválido, formatação)

**Email:**

- Validação RFC 5322 via Zod `.email()`
- Armazenamento seguro sem exposição desnecessária

---

## 📊 Auditoria de Dados

### 1. Logs de Sessão

**Validação em Server Actions:**

```typescript
const session = await getSession();
if (!session?.data?.user?.id) {
  return null; // Falha silenciosa
}
```

### 2. Invalidação de Cache

**React Query Keys:**

```typescript
export const FILA_ATIVA_QUERY_KEY = ["filaAtiva"];
export const ATENDIMENTOS_DIA_QUERY_KEY = ["atendimentosDia"];
// Invalidados após mutações via queryClient.invalidateQueries()
```

### 3. Notificações de Auditoria

**Tamanho da Auditoria:**

- Novos pacientes na fila → notificação para profissionais
- Mudança de status → invalidação de cache e refetch

---

## 🔍 Checklist de Auditoria

- [x] Cookies com HttpOnly/Secure em produção
- [x] Middleware valida RBAC antes de renderizar
- [x] Seed script cria admin padrão idempotentemente
- [x] CPF validado com algoritmo matemático
- [x] Sessão expira corretamente (30 dias inatividade)
- [x] ARIA labels em modais e botões
- [x] Formulários com labels explícitos
- [x] Navegação por teclado completa
- [x] Contraste WCAG AA em tema dark
- [x] Cache invalidado após mutações

---

## 🚀 Deployment Checklist

**Antes de Deploy para Produção:**

1. [ ] Alterar senha padrão do admin:

   ```bash
   pnpm db:seed # Cria admin@clinica.com / Clinica@2024
   # Depois altere manualmente na interface de admin
   ```

2. [ ] Validar URLs de trusted origins em produção:

   ```typescript
   trustedOrigins: [
     'https://clinica-seu-dominio.com', // Altere para domínio real
   ],
   ```

3. [ ] Validar variáveis de ambiente:

   ```env
   # src/lib/auth-client.ts
   NEXT_PUBLIC_BETTER_AUTH_URL=https://clinica-seu-dominio.com
   ```

4. [ ] Testar fluxo de password recovery em produção
5. [ ] Verificar logs de sessão/cookies
6. [ ] Validar RBAC em rotas protegidas
7. [ ] Testar acessibilidade com WAVE ou Axe DevTools

---

## 📚 Referências

- [BetterAuth Documentation](https://www.better-auth.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/aria/practices/)
- [Next.js Security Best Practices](https://nextjs.org/docs/security)
