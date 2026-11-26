import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/components/tablet/checkin/TotemCheckinPage", () => ({
  default: () => <main aria-label="Totem de check-in" />,
}));

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NOME_COOKIE_ACESSO, gerarAutorizacao } from "@/lib/crm/acesso";
import RecepcaoCrmPage from "./page";

const CHAVE_ACESSO = "chave-de-acesso-de-teste-com-32-caracteres-ou-mais";
const OUTRA_CHAVE_ACESSO = "outra-chave-de-acesso-de-teste-com-32-caracteres";

function definirCookieAcesso(valor: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (nome: string) =>
      nome === NOME_COOKIE_ACESSO && valor !== undefined ? { name: nome, value: valor } : undefined,
  } as never);
}

beforeEach(() => {
  vi.stubEnv("CRM_CHECKIN_ACCESS_KEY", CHAVE_ACESSO);
  definirCookieAcesso(gerarAutorizacao(CHAVE_ACESSO, "dispositivo-1"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Cenário: Totem de teste desligado (rota /recepcao-crm)", () => {
  it.each([
    ["false", "false"],
    ["vazia (ausente)", ""],
  ])("calls notFound when CRM_CHECKIN_ENABLED is %s", async (_rotulo, valor) => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", valor);

    await expect(RecepcaoCrmPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the check-in totem when CRM_CHECKIN_ENABLED is true and access is authorized", async () => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", "true");

    render(await RecepcaoCrmPage());

    expect(screen.getByRole("main", { name: "Totem de check-in" })).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("Cenário: Acesso sem autorização", () => {
  it.each([
    ["sem cookie", () => undefined],
    ["cookie adulterado", () => `${gerarAutorizacao(CHAVE_ACESSO, "dispositivo-1")}x`],
    ["cookie lixo", () => "valor-qualquer"],
    ["cookie de outra chave", () => gerarAutorizacao(OUTRA_CHAVE_ACESSO, "dispositivo-1")],
  ])("calls notFound with the totem enabled and %s", async (_rotulo, valor) => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", "true");
    definirCookieAcesso(valor());

    await expect(RecepcaoCrmPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});

describe("Ordem das checagens", () => {
  it("does not read the authorization cookie when the flag is off", async () => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", "false");
    const get = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ get } as never);

    await expect(RecepcaoCrmPage()).rejects.toThrow("NEXT_NOT_FOUND");

    expect(cookies).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });
});
