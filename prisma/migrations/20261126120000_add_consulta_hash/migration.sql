-- AlterTable
ALTER TABLE "atendimento" ADD COLUMN "consultaHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "atendimento_consultaHash_key" ON "atendimento"("consultaHash");
