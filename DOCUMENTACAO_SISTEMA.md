# Documentação de Rotas, Permissões e Fluxos

## 📋 Índice

- [Rotas da Aplicação](#rotas-da-aplicação)
- [Sistema de Permissões](#sistema-de-permissões)
- [Middleware de Autenticação](#middleware-de-autenticação)
- [Server Actions](#server-actions)
- [Fluxos da Aplicação](#fluxos-da-aplicação)
- [Configuração RLS (Row Level Security)](#configuração-rls)

---

## 🛣️ Rotas da Aplicação

### Rotas Públicas (Sem Autenticação)

#### 1. `/` - Totem de Auto-atendimento (Kiosk)

- **Descrição:** Interface de tablet para pacientes se registrarem na fila
- **Funcionalidades:**
  - Entrada de nome do paciente
  - Seleção de tipo de atendimento (Normal/Urgente)
  - Animação do robô interativo
  - Confirmação visual e sonora
- **Middleware:** Acesso permitido (PUBLIC_ONLY_ROUTES)
- **Components:** `KioskInteractionFlow`, `RobotFaceContainer`

#### 2. `/tv` - Monitor da Sala de Espera

- **Descrição:** Tela pública para TV na sala de espera
- **Funcionalidades:**
  - Exibição da última chamada em destaque
  - Lista dos próximos da fila (Urgente + Normal)
  - Atualização em tempo real via Supabase Realtime
  - Alertas sonoros para novos pacientes
  - Modo fullscreen
- **Middleware:** Acesso totalmente público (FULLY_PUBLIC_ROUTES)
- **Server Action:** `obterFilaPublica()`
- **Real-time:** Hook `useRealtimeQueuePublic`

#### 3. `/publico/atendimentos` - Tela de Atendimentos Pública

- **Descrição:** Interface completa de atendimentos para dispositivos compartilhados
- **Funcionalidades:**
  - Visualização da fila dividida por prioridade (2 colunas)
  - Conclusão de atendimentos com modal de confirmação
  - Optimistic updates
  - Sincronização em tempo real
  - Badges de contagem (Normal/Urgente)
- **Middleware:** Acesso totalmente público (FULLY_PUBLIC_ROUTES)
- **Server Action:** `finalizarAtendimentoPublico()`
- **Real-time:** Hook `useRealtimeQueuePublic`
- **Caso de Uso:** Tablets na recepção sem login

### Rotas Protegidas (Requer Autenticação)

#### 4. `/painel/login` - Login

- **Descrição:** Página de autenticação
- **Funcionalidades:**
  - Login com email/senha via BetterAuth
  - Redirecionamento após login bem-sucedido
- **Middleware:** Redireciona se já autenticado (PUBLIC_ONLY_ROUTES)

#### 5. `/painel` - Dashboard Principal

- **Descrição:** Painel de atendimentos para profissionais autenticados
- **Funcionalidades:**
  - Visualização da fila dividida por prioridade (2 colunas)
  - Conclusão de atendimentos com modal de confirmação
  - Card de atalho para atendimentos públicos
  - Optimistic updates
  - Real-time via Supabase
  - Marca notificações como lidas automaticamente
- **Middleware:** Autenticação obrigatória (PROTECTED_ROUTES)
- **Permissão:** Qualquer usuário autenticado
- **Server Actions:** `obterFilaAtiva()`, `finalizarAtendimento()`

#### 6. `/painel/usuarios` - Gerenciamento de Usuários

- **Descrição:** Lista e gerenciamento de usuários do sistema
- **Funcionalidades:**
  - Lista de todos os usuários
  - Filtros e busca
  - Edição de perfil
- **Middleware:** Autenticação obrigatória (PROTECTED_ROUTES)
- **Permissão:** Qualquer usuário autenticado

#### 7. `/painel/usuarios/novo` - Criar Novo Usuário

- **Descrição:** Formulário para adicionar novo usuário
- **Middleware:** Autenticação obrigatória (PROTECTED_ROUTES)
- **Permissão:** Qualquer usuário autenticado

#### 8. `/painel/historico` - Histórico de Atendimentos

- **Descrição:** Histórico completo dos atendimentos finalizados
- **Funcionalidades:**
  - Listagem de atendimentos finalizados
  - Filtros por data/turno
  - Estatísticas
- **Middleware:** Autenticação obrigatória (PROTECTED_ROUTES)
- **Permissão:** Qualquer usuário autenticado
- **Server Action:** `obterAtendimentosDoDia()`

#### 9. `/painel/equipe` - Gerenciamento de Equipe

- **Descrição:** Administração de profissionais
- **Middleware:** Autenticação obrigatória (PROTECTED_ROUTES)
- **Permissão:** **APENAS ADMIN** (ADMIN_ONLY_ROUTES)

#### 10. `/esqueci-a-senha` - Recuperação de Senha

- **Descrição:** Fluxo de recuperação de senha
- **Middleware:** Redireciona se já autenticado (PUBLIC_ONLY_ROUTES)

#### 11. `/redefinir-senha` - Redefinição de Senha

- **Descrição:** Página para redefinir senha após receber token
- **Middleware:** Redireciona se já autenticado (PUBLIC_ONLY_ROUTES)

---

## 🔐 Sistema de Permissões

### Roles (Papéis)

#### 1. **Anônimo** (Sem Autenticação)

- Acesso ao totem (`/`)
- Acesso ao monitor da TV (`/tv`)
- Acesso aos atendimentos públicos (`/publico/atendimentos`)
- **Pode:**
  - Registrar-se na fila
  - Visualizar fila ativa
  - Concluir atendimentos (na tela pública)

#### 2. **Profissional** (Autenticado)

- Acesso a todas as rotas do painel
- **Pode:**
  - Visualizar fila de atendimentos
  - Concluir atendimentos
  - Ver histórico
  - Gerenciar usuários
  - Ver notificações
- **Não pode:**
  - Acessar gerenciamento de equipe

#### 3. **Admin** (Autenticado com role=admin)

- Acesso total ao sistema
- **Pode:**
  - Tudo que o profissional pode
  - Gerenciar equipe (`/painel/equipe`)
  - RBAC completo

### Hierarquia de Permissões

```
Anônimo
  ├── Registrar na fila (Totem)
  ├── Visualizar fila (TV)
  └── Concluir atendimentos (Tela pública)

Profissional (Autenticado)
  ├── Todas as permissões de Anônimo
  ├── Dashboard de atendimentos
  ├── Histórico completo
  ├── Notificações
  └── Gerenciar usuários básico

Admin
  ├── Todas as permissões de Profissional
  └── Gerenciamento de equipe (RBAC)
```

---

## 🚦 Middleware de Autenticação

### Arquivo: `src/proxy.ts`

#### Categorias de Rotas

```typescript
// 1. Rotas protegidas por RBAC (apenas admin)
const ADMIN_ONLY_ROUTES = [
  APP_ROUTES.EQUIPE, // /painel/equipe
];

// 2. Rotas protegidas (requer autenticação)
const PROTECTED_ROUTES = [
  APP_ROUTES.DASHBOARD, // /painel
  APP_ROUTES.USUARIOS, // /painel/usuarios
  APP_ROUTES.HISTORICO, // /painel/historico
  APP_ROUTES.NOVO_USUARIO, // /painel/usuarios/novo
  APP_ROUTES.CONFIGURACOES, // /painel/configuracoes
];

// 3. Rotas públicas que redirecionam se autenticado
const PUBLIC_ONLY_ROUTES = [
  APP_ROUTES.ESQUECI_SENHA, // /esqueci-a-senha
  APP_ROUTES.REDEFINIR_SENHA, // /redefinir-senha
  APP_ROUTES.LOGIN, // /painel/login
  APP_ROUTES.TOTEM, // /
];

// 4. Rotas totalmente públicas (sem redirecionamento)
const FULLY_PUBLIC_ROUTES = [
  APP_ROUTES.TV, // /tv
  APP_ROUTES.PUBLICO_ATENDIMENTOS, // /publico/atendimentos
];
```

#### Regras de Middleware

1. **FULLY_PUBLIC_ROUTES**: Passa sem verificar sessão
2. **ADMIN_ONLY_ROUTES**:
   - Não autenticado → Redireciona para login
   - Autenticado mas não admin → Redireciona para dashboard
3. **PROTECTED_ROUTES**:
   - Não autenticado → Redireciona para login
   - Autenticado → Permite acesso
4. **PUBLIC_ONLY_ROUTES**:
   - Autenticado → Redireciona para dashboard
   - Não autenticado → Permite acesso

#### Matcher Config

```typescript
export const config = {
  matcher: ["/painel/:path*", "/esqueci-a-senha", "/redefinir-senha"],
};
```

**Exclusões:** `/_next`, `/api`, `/public` (não passam pelo middleware)

---

## ⚙️ Server Actions

### Arquivo: `src/server/actions/atendimento.ts`

#### Actions Autenticadas

##### 1. `registrarEEntrarNaFila(dados)`

- **Descrição:** Registra novo paciente na fila
- **Parâmetros:** `{ nome: string, tipoChamada: "normal" | "urgente" }`
- **Autenticação:** Não requer (usado pelo totem público)
- **Side Effects:**
  - Cria notificações para toda a equipe
  - Dispara evento de real-time

##### 2. `finalizarAtendimento(atendimentoId)`

- **Descrição:** Marca atendimento como finalizado
- **Autenticação:** Não verifica (mas rota é protegida)
- **Side Effects:**
  - Atualiza status para "finalizado"
  - Define `finalizadoEm` com timestamp atual

##### 3. `obterFilaAtiva()`

- **Descrição:** Retorna fila de pacientes aguardando
- **Autenticação:** Não verifica (mas rota é protegida)
- **Ordenação:** Urgente primeiro, depois por data de criação
- **Retorna:** Array de atendimentos com status "aguardando"

##### 4. `obterAtendimentosDoDia()`

- **Descrição:** Histórico de atendimentos finalizados do turno atual
- **Autenticação:** Não verifica (mas rota é protegida)
- **Filtros:** Status "finalizado", não arquivado, dentro do turno atual
- **Retorna:** Array ordenado por `finalizadoEm` desc

##### 5. `arquivarAtendimentosDoTurno()`

- **Descrição:** Arquiva atendimentos finalizados do turno
- **Autenticação:** Não verifica (mas rota é protegida)
- **Retorna:** Quantidade de atendimentos arquivados

#### Actions Públicas

##### 6. `finalizarAtendimentoPublico(atendimentoId)`

- **Descrição:** Versão pública de finalizar atendimento
- **Autenticação:** ❌ Não verifica sessão
- **Uso:** Tela pública de atendimentos
- **Funcionalidade:** Idêntica à versão autenticada

##### 7. `obterFilaPublica()`

- **Descrição:** Versão pública de obter fila ativa
- **Autenticação:** ❌ Não verifica sessão
- **Uso:** TV da sala de espera e tela pública
- **Retorna:** Mesmos dados da versão autenticada

### Arquivo: `src/server/actions/notificacoes.ts`

##### 8. `obterNotificacoes()`

- **Descrição:** Lista notificações do usuário logado
- **Autenticação:** ✅ Verifica sessão via `auth.api.getSession`
- **Filtros:** Apenas do usuário autenticado
- **Ordenação:** Não lidas primeiro, depois por data

##### 9. `marcarComoLida(id)`

- **Descrição:** Marca notificação específica como lida
- **Autenticação:** ✅ Verifica sessão
- **Validação:** Verifica ownership da notificação

##### 10. `marcarTodasComoLidas()`

- **Descrição:** Marca todas as notificações do usuário como lidas
- **Autenticação:** ✅ Verifica sessão
- **Side Effects:** Atualiza múltiplas notificações em batch

---

## 🔄 Fluxos da Aplicação

### 1. Fluxo de Registro na Fila (Totem)

```
1. Paciente acessa totem (/)
   └─> Animação de boas-vindas com robô

2. Paciente digita nome
   └─> Validação: mínimo 2 caracteres

3. Paciente seleciona prioridade
   ├─> Normal: Botão verde
   └─> Urgente: Botão vermelho

4. Confirmação
   └─> Animação de sucesso + som

5. Server Action: registrarEEntrarNaFila()
   ├─> Cria atendimento no banco
   ├─> Envia notificações para equipe
   └─> Dispara evento Realtime

6. Paciente aguarda na sala
   └─> Visualiza posição na TV (/tv)
```

### 2. Fluxo de Atendimento (Painel Administrativo)

```
1. Profissional faz login (/painel/login)
   └─> BetterAuth valida credenciais

2. Acessa dashboard (/painel)
   ├─> Hook useRealtimeQueue sincroniza
   └─> Notificações marcadas como lidas

3. Visualiza fila dividida
   ├─> Coluna Esquerda: Normal
   └─> Coluna Direita: Urgente

4. Clica em "Concluir" no card do paciente
   └─> Modal de confirmação abre

5. Confirma conclusão
   ├─> Optimistic update (UI imediata)
   ├─> Server Action: finalizarAtendimento()
   ├─> Toast de sucesso
   └─> Card desaparece com animação

6. Real-time atualiza outros dispositivos
   └─> Todos os painéis sincronizam automaticamente
```

### 3. Fluxo de Atendimento (Tela Pública)

```
1. Tablet/Dispositivo compartilhado acessa
   └─> /publico/atendimentos (sem login)

2. Visualiza fila em tempo real
   ├─> Hook useRealtimeQueuePublic sincroniza
   └─> Refetch a cada 5s como fallback

3. Recepcionista clica em "Concluir"
   └─> Modal de confirmação abre

4. Confirma conclusão
   ├─> Optimistic update
   ├─> Server Action: finalizarAtendimentoPublico()
   ├─> Toast de sucesso
   └─> Sincronização automática

5. Atualização refletida em todos os painéis
   ├─> Painel administrativo
   ├─> Outros tablets públicos
   └─> TV da sala de espera
```

### 4. Fluxo de Notificações

```
1. Novo paciente registrado no totem
   └─> Server Action cria notificações

2. Notificações criadas para cada profissional
   ├─> Tipo: URGENTE ou NORMAL
   ├─> Título: "Paciente urgente na fila" ou "Novo paciente na fila"
   └─> Mensagem: "Novo Paciente: [Nome]"

3. Hook useNotificationListener detecta via Realtime
   ├─> Query "notificacoes" é invalidada
   └─> Refetch automático

4. NotificationBell atualiza contador
   ├─> Badge vermelho com quantidade
   └─> Dropdown mostra notificações

5. Usuário abre dropdown
   └─> Clica em "Marcar todas como lidas"

6. Notificações atualizadas
   ├─> Badge desaparece
   └─> Lista atualiza visualmente
```

### 5. Fluxo de Real-time (Supabase)

```
1. Evento no banco de dados
   ├─> INSERT em "atendimento"
   ├─> UPDATE em "atendimento"
   └─> DELETE em "atendimento"

2. Supabase Realtime detecta via postgres_changes
   └─> Publica evento no canal

3. Clientes inscritos recebem payload
   ├─> useRealtimeQueue (painel admin)
   ├─> useRealtimeQueuePublic (tela pública/TV)
   └─> useNotificationListener (notificações)

4. Hooks processam payload
   ├─> Normalizam dados
   ├─> Aplicam ordenação (urgente primeiro)
   └─> Atualizam cache do React Query

5. UI atualiza instantaneamente
   ├─> Cards aparecem/desaparecem
   ├─> Contadores atualizam
   └─> Animações suaves (Framer Motion)
```

### 6. Fluxo de Optimistic Updates

```
1. Usuário clica em "Concluir"
   └─> React executa onMutate

2. Optimistic update aplicado
   ├─> setOptimisticFila remove item
   ├─> UI atualiza IMEDIATAMENTE
   └─> Usuário vê feedback instantâneo

3. Mutation enviada ao servidor
   └─> Server Action processa

4. Sucesso
   ├─> Query invalidada
   └─> Refetch silencioso confirma estado

5. Erro
   ├─> Toast de erro exibido
   ├─> Query invalidada
   └─> UI reverte ao estado anterior
```

---

## 🔒 Configuração RLS (Row Level Security)

### Tabela: `atendimento`

#### 1. Habilitar RLS

```sql
ALTER TABLE public.atendimento ENABLE ROW LEVEL SECURITY;
```

#### 2. Política de Leitura Pública

```sql
CREATE POLICY "Permitir leitura pública de atendimentos aguardando"
ON public.atendimento
FOR SELECT
TO anon, authenticated
USING (status = 'aguardando');
```

**Explicação:**

- **FOR SELECT**: Apenas leitura
- **TO anon, authenticated**: Usuários anônimos e autenticados
- **USING**: Restringe a atendimentos com status "aguardando"

#### 3. Políticas de Escrita (Autenticados)

```sql
-- INSERT
CREATE POLICY "Apenas service_role pode inserir atendimentos"
ON public.atendimento
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE
CREATE POLICY "Apenas service_role pode atualizar atendimentos"
ON public.atendimento
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE
CREATE POLICY "Apenas service_role pode deletar atendimentos"
ON public.atendimento
FOR DELETE
TO authenticated
USING (true);
```

#### 4. Configurar Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.atendimento;
```

**Verificar no Painel:**

- Database > Replication
- Tabela `atendimento` deve estar marcada

### Segurança Implementada

#### ✅ Dados Expostos Publicamente

- Nome do paciente (necessário para chamada)
- Tipo de atendimento (normal/urgente)
- Tempo de espera (calculado no cliente)
- Status "aguardando" apenas

#### ❌ Dados Protegidos

- IDs de atendimento (expostos mas sem uso sensível)
- Atendimentos finalizados
- Atendimentos arquivados
- Dados de usuários/profissionais
- E-mails, senhas, tokens

---

## 📊 Resumo de Tecnologias

### Frontend

- **Next.js 15**: App Router, Server Components
- **React Query**: Cache e sincronização
- **Framer Motion**: Animações
- **Tailwind CSS**: Estilização
- **Recharts**: Gráficos (opcional, instalado mas não usado em produção)
- **Shadcn/ui**: Componentes base

### Backend

- **Next.js Server Actions**: API sem rotas explícitas
- **Prisma**: ORM para PostgreSQL
- **BetterAuth**: Autenticação completa
- **Zod**: Validação de schemas

### Real-time

- **Supabase Realtime**: WebSocket para sincronização
- **postgres_changes**: Eventos do banco de dados

### Infraestrutura

- **PostgreSQL**: Banco de dados principal
- **Supabase**: Plataforma (DB + Real-time + RLS)

---

## 🎯 Boas Práticas Implementadas

### 1. **Optimistic Updates**

- Updates instantâneos na UI
- Rollback automático em caso de erro
- Melhor UX percebida

### 2. **Real-time Sincronização**

- Múltiplos dispositivos sincronizados
- Sem necessidade de polling constante
- Economia de recursos

### 3. **Segurança em Camadas**

- Middleware protege rotas
- RLS protege dados no banco
- Server Actions validam inputs

### 4. **Separação de Contextos**

- Queries separadas (autenticada vs pública)
- Hooks dedicados por caso de uso
- Components reutilizáveis

### 5. **UX Responsiva**

- Loaders removidos para evitar flickering
- Animações suaves (Framer Motion)
- Toast notifications informativas
- Modal de confirmação para ações destrutivas

---

## 📝 Convenções de Código

### Nomenclatura

- **Components**: PascalCase (`AtendimentoCard`)
- **Hooks**: camelCase com prefixo `use` (`useRealtimeQueue`)
- **Server Actions**: camelCase (`obterFilaAtiva`)
- **Constants**: UPPER_SNAKE_CASE (`FILA_ATIVA_QUERY_KEY`)
- **Files**: kebab-case (`atendimento-card.tsx`)

### Estrutura de Pastas

```
src/
├── app/                    # Rotas Next.js
│   ├── (auth)/            # Grupo de rotas de auth
│   ├── (tablet)/          # Grupo de rotas do totem
│   ├── painel/            # Dashboard administrativo
│   └── publico/           # Rotas públicas
├── components/            # Componentes React
│   ├── common/           # Componentes compartilhados
│   ├── dashboard/        # Componentes do dashboard
│   ├── painel/           # Componentes do painel
│   ├── tablet/           # Componentes do totem
│   └── ui/              # Componentes primitivos (shadcn)
├── hooks/                # Custom hooks
├── lib/                  # Utilitários
│   ├── utils/           # Funções auxiliares
│   └── validations/     # Schemas Zod
├── server/              # Backend
│   └── actions/         # Server Actions
└── types/              # TypeScript types
```

---

## 🚀 Deploy e Variáveis de Ambiente

### Variáveis Necessárias

```env
# Database (Supabase)
DATABASE_URL=postgresql://...      # Pooler (runtime)
DIRECT_URL=postgresql://...        # Direct (migrations)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # NUNCA expor ao cliente

# BetterAuth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# Email (opcional)
EMAIL_SERVER=smtp://...
EMAIL_FROM=noreply@example.com
```

### Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] RLS habilitado no Supabase
- [ ] Realtime configurado para tabela `atendimento`
- [ ] Migrations executadas
- [ ] Seed de dados inicial (opcional)
- [ ] Build sem erros
- [ ] Testar rotas públicas e protegidas
- [ ] Verificar Real-time em produção

---

**Última atualização:** 14 de abril de 2026
**Versão:** 1.0.0
