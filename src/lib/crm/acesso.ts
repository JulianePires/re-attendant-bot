import "server-only";

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { obterChaveAcesso } from "./config";

/**
 * Autorização de dispositivo do totem de teste (RNF-001.4).
 * O cookie guarda `<id do dispositivo>.<assinatura>`, nunca a chave: o id permite
 * limitar buscas por dispositivo, e a assinatura deriva da chave, então trocar a
 * chave desautoriza todos os tablets de uma vez.
 */

export const NOME_COOKIE_ACESSO = "totem_crm_acesso";

// Máximo que o Chrome aceita para um cookie (decisão da usuária, 2026-11-26).
export const VALIDADE_ACESSO_SEGUNDOS = 400 * 24 * 60 * 60;

function assinar(chave: string, idDispositivo: string): string {
  return createHmac("sha256", chave).update(idDispositivo).digest("base64url");
}

// timingSafeEqual exige o mesmo tamanho: comparar os resumos iguala as entradas.
function iguaisEmTempoConstante(a: string, b: string): boolean {
  const resumoA = createHash("sha256").update(a).digest();
  const resumoB = createHash("sha256").update(b).digest();
  return timingSafeEqual(resumoA, resumoB);
}

export function chaveAcessoConfere(informada: string, chave: string): boolean {
  if (!informada || !chave) return false;
  return iguaisEmTempoConstante(informada, chave);
}

export function gerarAutorizacao(chave: string, idDispositivo: string = randomUUID()): string {
  return `${idDispositivo}.${assinar(chave, idDispositivo)}`;
}

/** Devolve o id do dispositivo quando a autorização foi assinada com esta chave. */
export function validarAutorizacao(valor: string | undefined, chave: string): string | null {
  if (!valor || !chave) return null;

  const separador = valor.indexOf(".");
  if (separador <= 0) return null;

  const idDispositivo = valor.slice(0, separador);
  const assinatura = valor.slice(separador + 1);
  if (!assinatura) return null;

  return iguaisEmTempoConstante(assinatura, assinar(chave, idDispositivo)) ? idDispositivo : null;
}

/** Id do dispositivo desta requisição, ou null se ele não foi ativado com a chave atual. */
export async function obterDispositivoAutorizado(): Promise<string | null> {
  const chave = obterChaveAcesso();
  if (!chave) return null;

  const valor = (await cookies()).get(NOME_COOKIE_ACESSO)?.value;
  return validarAutorizacao(valor, chave);
}
