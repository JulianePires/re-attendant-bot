# Configuração de Row Level Security (RLS) para Tela da TV

## Contexto

A tela pública `/tv` precisa acessar dados da tabela `atendimento` sem autenticação de usuário. O Supabase Realtime também precisa funcionar para usuários anônimos (role `anon`).

## Instruções SQL para o Painel do Supabase

Execute os seguintes comandos SQL no **SQL Editor** do painel do Supabase:

### 1. Habilitar RLS na tabela `atendimento`

```sql
-- Habilita Row Level Security na tabela atendimento
ALTER TABLE public.atendimento ENABLE ROW LEVEL SECURITY;
```

### 2. Criar política de leitura pública para usuários anônimos

```sql
-- Permite que qualquer usuário (incluindo anônimo) leia atendimentos aguardando
CREATE POLICY "Permitir leitura pública de atendimentos aguardando"
ON public.atendimento
FOR SELECT
TO anon, authenticated
USING (status = 'aguardando');
```

**Explicação:**

- `FOR SELECT`: Aplica-se apenas a operações de leitura (`SELECT`)
- `TO anon, authenticated`: Válida para usuários anônimos e autenticados
- `USING (status = 'aguardando')`: Restringe acesso apenas a atendimentos com status "aguardando"

### 3. Manter políticas restritas para INSERT/UPDATE/DELETE

```sql
-- Apenas usuários autenticados podem inserir (usado pelo kiosk via service_role)
CREATE POLICY "Apenas service_role pode inserir atendimentos"
ON public.atendimento
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Apenas usuários autenticados podem atualizar
CREATE POLICY "Apenas service_role pode atualizar atendimentos"
ON public.atendimento
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Apenas usuários autenticados podem deletar
CREATE POLICY "Apenas service_role pode deletar atendimentos"
ON public.atendimento
FOR DELETE
TO authenticated
USING (true);
```

### 4. Configurar permissões de Realtime

```sql
-- Habilita Realtime para a tabela atendimento
ALTER PUBLICATION supabase_realtime ADD TABLE public.atendimento;
```

**Importante:** Verifique também no painel do Supabase:

1. Vá em **Database > Replication**
2. Certifique-se de que a tabela `atendimento` está marcada para replicação
3. Verifique que a publicação `supabase_realtime` inclui a tabela

### 5. Verificar configuração

```sql
-- Lista todas as políticas da tabela atendimento
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'atendimento';
```

## Segurança

✅ **O que está protegido:**

- Apenas atendimentos com `status = 'aguardando'` são visíveis publicamente
- Atendimentos finalizados ou arquivados não são expostos
- Operações de escrita (INSERT/UPDATE/DELETE) continuam restritas a usuários autenticados

✅ **O que a tela da TV pode fazer:**

- Ler atendimentos aguardando (`SELECT`)
- Receber atualizações em tempo real via Supabase Realtime
- Acessar sem necessidade de login

❌ **O que a tela da TV NÃO pode fazer:**

- Criar novos atendimentos
- Modificar ou deletar atendimentos existentes
- Acessar atendimentos finalizados ou dados históricos

## Notas Adicionais

### Chaves de API

A aplicação usa duas chaves do Supabase:

1. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (role `anon`)
   - Usada no cliente (navegador)
   - Limitada pelas políticas RLS
   - Segura para exposição pública

2. **`SUPABASE_SERVICE_ROLE_KEY`** (role `service_role`)
   - Usada no servidor (Server Actions)
   - Bypassa todas as políticas RLS
   - **NUNCA** deve ser exposta ao cliente

### Teste de Permissões

Para testar se as permissões estão corretas:

```sql
-- Simula acesso como usuário anônimo
SET ROLE anon;

-- Deve retornar apenas atendimentos aguardando
SELECT * FROM public.atendimento;

-- Deve falhar (sem permissão)
INSERT INTO public.atendimento (nomePaciente, tipoChamada, status)
VALUES ('Teste', 'normal', 'aguardando');

-- Volta ao role padrão
RESET ROLE;
```

## Troubleshooting

### Se o Realtime não estiver funcionando:

1. Verifique se a publicação está ativa:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

2. Recrie a publicação se necessário:

```sql
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.atendimento;
```

### Se a tela da TV não conseguir ler dados:

1. Confirme que o RLS está habilitado:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'atendimento';
```

2. Verifique as políticas:

```sql
SELECT * FROM pg_policies WHERE tablename = 'atendimento';
```

## Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
