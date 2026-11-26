import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/components/tablet/checkin/TotemCheckinPage", () => ({
  default: () => <main aria-label="Totem de check-in" />,
}));

import { notFound } from "next/navigation";
import RecepcaoCrmPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Cenário: Totem de teste desligado (rota /recepcao-crm)", () => {
  it.each([
    ["false", "false"],
    ["vazia (ausente)", ""],
  ])("calls notFound when CRM_CHECKIN_ENABLED is %s", (_rotulo, valor) => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", valor);

    expect(() => RecepcaoCrmPage()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the check-in totem when CRM_CHECKIN_ENABLED is true", () => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", "true");

    render(RecepcaoCrmPage());

    expect(screen.getByRole("main", { name: "Totem de check-in" })).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
