/** Código do erro do Prisma (ex.: "P2002"), quando houver; nunca a mensagem, que pode ter dados pessoais. */
export function codigoDoErro(erro: unknown): string | undefined {
  return typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    typeof erro.code === "string"
    ? erro.code
    : undefined;
}
