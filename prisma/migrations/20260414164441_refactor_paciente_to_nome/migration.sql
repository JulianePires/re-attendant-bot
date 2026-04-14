-- ================================================================
-- REFATORAÇÃO CRÍTICA: Pacientes não são mais Usuários
-- 
-- Esta migration realiza as seguintes operações:
-- 1. Adiciona campo nomePaciente direto na tabela atendimento
-- 2. Migra dados existentes (copia user.name → atendimento.nomePaciente)
-- 3. Remove a foreign key e a coluna pacienteId
-- 4. Remove role 'paciente' da tabela user (aceita apenas admin/profissional)
-- 
-- ATENÇÃO: Esta é uma operação destrutiva. Execute apenas após backup.
-- ================================================================

-- Passo 1: Adicionar coluna nomePaciente (temporariamente nullable)
ALTER TABLE "atendimento" 
ADD COLUMN "nomePaciente" TEXT;

-- Passo 2: Migrar dados existentes (copiar nome do paciente)
-- Se houver atendimentos com pacienteId válido, copia o nome
UPDATE "atendimento" AS a
SET "nomePaciente" = u."name"
FROM "user" AS u
WHERE a."pacienteId" = u.id;

-- Passo 3: Definir valor padrão para registros sem paciente (edge case)
UPDATE "atendimento"
SET "nomePaciente" = 'Paciente sem registro'
WHERE "nomePaciente" IS NULL;

-- Passo 4: Tornar nomePaciente obrigatório
ALTER TABLE "atendimento" 
ALTER COLUMN "nomePaciente" SET NOT NULL;

-- Passo 5: Remover a foreign key constraint
ALTER TABLE "atendimento" 
DROP CONSTRAINT IF EXISTS "atendimento_pacienteId_fkey";

-- Passo 6: Remover a coluna pacienteId
ALTER TABLE "atendimento" 
DROP COLUMN "pacienteId";

-- Passo 7: Remover todos os usuários com role 'paciente' (limpeza)
-- CUIDADO: Isso remove permanentemente pacientes antigos do sistema
DELETE FROM "user" 
WHERE "role" = 'paciente';

-- Passo 8: Alterar o default da role para 'profissional'
ALTER TABLE "user" 
ALTER COLUMN "role" SET DEFAULT 'profissional';

-- Resultado: 
-- - Tabela atendimento agora tem nomePaciente TEXT NOT NULL
-- - Não há mais relação entre atendimento e user
-- - Tabela user reservada apenas para admin/profissional
