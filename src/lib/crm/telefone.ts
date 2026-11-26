import { MENSAGEM_TELEFONE_INVALIDO } from "./mensagens";

export type ResultadoValidacaoTelefone =
  | { valido: true; digitos: string }
  | { valido: false; mensagem: string };

const CODIGO_PAIS = "55";

export function extrairDigitos(entrada: string): string {
  return entrada.replace(/\D/g, "");
}

/**
 * Aceita DDD + número (10 ou 11 dígitos) ou o mesmo com o código do país "55"
 * na frente (12 ou 13). O CRM aceita os dois formatos, então os dígitos seguem
 * como foram digitados, sem remover o "55" (RF-001.2).
 */
export function validarTelefone(entrada: string): ResultadoValidacaoTelefone {
  const digitos = extrairDigitos(entrada);
  const tamanho = digitos.length;

  const nacional = tamanho === 10 || tamanho === 11;
  const comCodigoPais = (tamanho === 12 || tamanho === 13) && digitos.startsWith(CODIGO_PAIS);

  if (nacional || comCodigoPais) {
    return { valido: true, digitos };
  }

  return { valido: false, mensagem: MENSAGEM_TELEFONE_INVALIDO };
}

/** Máscara progressiva para exibição enquanto o paciente digita. */
export function formatarTelefone(digitos: string): string {
  if (digitos.length > 11 && digitos.startsWith(CODIGO_PAIS)) {
    return `+${CODIGO_PAIS} ${formatarTelefone(digitos.slice(CODIGO_PAIS.length))}`;
  }

  const numero = digitos.slice(0, 11);
  if (numero.length === 0) return "";
  if (numero.length <= 2) return `(${numero}`;

  const ddd = numero.slice(0, 2);
  const resto = numero.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;

  // 9 dígitos depois do DDD = celular (5 + 4); até 8 = fixo (4 + 4).
  const tamanhoPrefixo = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, tamanhoPrefixo)}-${resto.slice(tamanhoPrefixo)}`;
}
