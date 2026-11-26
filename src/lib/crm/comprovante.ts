import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * Comprovante opaco do agendamento entre localizar e confirmar (ADR 0003).
 * AES-256-GCM garante sigilo (o tablet não lê o consulta_id nem o nome, RNF-001.3)
 * e integridade (adulteração é detectada). Vale 5 min e só para o dispositivo
 * que fez a busca (RNF-001.2).
 */

export const VALIDADE_COMPROVANTE_MS = 5 * 60 * 1000;

const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

type DadosComprovante = {
  consultaId: string;
  nome: string;
  primeiroNome: string;
  idDispositivo: string;
};

export type AgendamentoDoComprovante = Omit<DadosComprovante, "idDispositivo">;

const schemaConteudo = z.object({
  consultaId: z.string().min(1),
  nome: z.string(),
  primeiroNome: z.string(),
  idDispositivo: z.string().min(1),
  expiraEm: z.number(),
});

// Contexto próprio: a mesma chave de acesso não é usada direto para cifrar.
function derivarChave(chave: string): Buffer {
  return Buffer.from(hkdfSync("sha256", chave, "", "totem-crm/comprovante/v1", 32));
}

export function emitirComprovante(
  dados: DadosComprovante,
  chave: string,
  agora: number = Date.now()
): string {
  const iv = randomBytes(TAMANHO_IV);
  const cifra = createCipheriv("aes-256-gcm", derivarChave(chave), iv);
  const conteudo = JSON.stringify({ ...dados, expiraEm: agora + VALIDADE_COMPROVANTE_MS });
  const cifrado = Buffer.concat([cifra.update(conteudo, "utf8"), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), cifrado]).toString("base64url");
}

/** Devolve o agendamento só se o comprovante for autêntico, válido e deste dispositivo. */
export function abrirComprovante(
  comprovante: string | undefined,
  chave: string,
  idDispositivo: string,
  agora: number = Date.now()
): AgendamentoDoComprovante | null {
  if (!comprovante || !chave) return null;

  const bruto = Buffer.from(comprovante, "base64url");
  if (bruto.length <= TAMANHO_IV + TAMANHO_TAG) return null;

  try {
    const iv = bruto.subarray(0, TAMANHO_IV);
    const tag = bruto.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
    const cifrado = bruto.subarray(TAMANHO_IV + TAMANHO_TAG);
    const decifra = createDecipheriv("aes-256-gcm", derivarChave(chave), iv);
    decifra.setAuthTag(tag);
    const texto = Buffer.concat([decifra.update(cifrado), decifra.final()]).toString("utf8");

    const conteudo = schemaConteudo.safeParse(JSON.parse(texto));
    if (!conteudo.success) return null;
    if (conteudo.data.idDispositivo !== idDispositivo) return null;
    if (agora >= conteudo.data.expiraEm) return null;

    const { consultaId, nome, primeiroNome } = conteudo.data;
    return { consultaId, nome, primeiroNome };
  } catch {
    // Tag inválida (adulterado ou outra chave) ou conteúdo corrompido.
    return null;
  }
}
