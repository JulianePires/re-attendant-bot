-- Pivot de regra de negocio: dados do paciente simplificados e arquivamento por turno
ALTER TABLE "user"
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "cpf" DROP NOT NULL;

ALTER TABLE "atendimento"
ADD COLUMN "arquivadoTurno" BOOLEAN NOT NULL DEFAULT false;
