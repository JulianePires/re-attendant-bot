import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

import { config, proxy } from "./proxy";

function requisicao(rota: string) {
  return new NextRequest(`http://localhost${rota}`);
}

describe("proxy (Rotas atuais sem mudança de acesso)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(null);
  });

  it.each(["/recepcao", "/tv", "/monitor"])(
    "does not redirect %s when there is no session",
    async (rota) => {
      const resposta = await proxy(requisicao(rota));

      expect(resposta.headers.get("location")).toBeNull();
    }
  );

  it("redirects /adm to /adm/login when there is no session", async () => {
    const resposta = await proxy(requisicao("/adm"));

    expect(resposta.headers.get("location")).toMatch(/\/adm\/login$/);
  });

  it("redirects /painel/historico to /adm/historico", async () => {
    const resposta = await proxy(requisicao("/painel/historico"));

    expect(resposta.headers.get("location")).toMatch(/\/adm\/historico$/);
  });

  it("keeps the kiosk routes out of the proxy matcher", () => {
    const entradas = [config.matcher].flat();

    expect(entradas.length).toBeGreaterThan(0);
    expect(entradas.filter((m) => String(m).includes("recepcao"))).toEqual([]);
  });
});

describe("proxy matcher (Rotas atuais sem mudança de acesso)", () => {
  // Padrões do matcher: "/x/:path*" casa "/x" e tudo abaixo; o resto casa literal.
  function casa(padrao: string, rota: string): boolean {
    if (padrao.endsWith("/:path*")) {
      const base = padrao.slice(0, -"/:path*".length);
      return rota === base || rota.startsWith(`${base}/`);
    }
    return rota === padrao;
  }

  it.each(["/recepcao-crm", "/recepcao-crm/ativar", "/tv", "/monitor"])(
    "matcher does not cover %s",
    (rota) => {
      const padroes = [config.matcher].flat().map(String);

      expect(padroes.length).toBeGreaterThan(0);
      expect(padroes.filter((p) => casa(p, rota))).toEqual([]);
    }
  );

  it("matcher still covers /adm/login (sanity check of the matcher helper)", () => {
    const padroes = [config.matcher].flat().map(String);

    expect(padroes.some((p) => casa(p, "/adm/login"))).toBe(true);
  });
});
