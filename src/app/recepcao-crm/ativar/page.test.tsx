import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/components/tablet/checkin/AtivacaoTotemForm", () => ({
  default: () => <form aria-label="Ativar totem" />,
}));

import { notFound } from "next/navigation";
import AtivarPage from "./page";

const CHAVE_ACESSO = "chave-de-acesso-de-teste-com-32-caracteres-ou-mais";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Cenário: Tela de ativação com o totem de teste desligado", () => {
  it.each([
    ["flag false", "false", CHAVE_ACESSO],
    ["flag ausente", "", CHAVE_ACESSO],
    ["chave de acesso ausente", "true", ""],
    ["chave de acesso com 31 caracteres", "true", "a".repeat(31)],
  ])("calls notFound when %s", (_rotulo, flag, chave) => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", flag);
    vi.stubEnv("CRM_CHECKIN_ACCESS_KEY", chave);

    expect(() => AtivarPage()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the activation form when the flag is on and the access key is configured", () => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", "true");
    vi.stubEnv("CRM_CHECKIN_ACCESS_KEY", CHAVE_ACESSO);

    render(AtivarPage());

    expect(screen.getByRole("form", { name: "Ativar totem" })).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("Chave de acesso no limite do tamanho mínimo", () => {
  it("renders the form with an access key of exactly 32 characters", () => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", "true");
    vi.stubEnv("CRM_CHECKIN_ACCESS_KEY", "a".repeat(32));

    render(AtivarPage());

    expect(screen.getByRole("form", { name: "Ativar totem" })).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
