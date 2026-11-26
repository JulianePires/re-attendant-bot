import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const SRC = join(RAIZ, "src");

function listarFontes(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return listarFontes(caminho);
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

describe("isolamento da chave de API do CRM (RNF-001.1)", () => {
  it("client.ts imports server-only", () => {
    const fonte = readFileSync(join(SRC, "lib/crm/client.ts"), "utf-8");

    expect(fonte).toMatch(/^\s*import\s+["']server-only["'];?/m);
  });

  it("no use-client file imports lib/crm/client or lib/crm/config", () => {
    const proibido =
      /from\s+["'](@\/lib\/crm\/(client|config)|(\.{1,2}\/)+(lib\/)?crm\/(client|config))["']/;
    const infratores = listarFontes(SRC).filter((arquivo) => {
      const fonte = readFileSync(arquivo, "utf-8");
      const clienteNoNavegador = /^\s*["']use client["']/m.test(fonte);
      return clienteNoNavegador && proibido.test(fonte);
    });

    expect(infratores).toEqual([]);
  });

  it(".env.example declares no NEXT_PUBLIC_CRM_* variable", () => {
    const env = readFileSync(join(RAIZ, ".env.example"), "utf-8");

    expect(env).not.toMatch(/NEXT_PUBLIC_CRM_/);
  });
});
