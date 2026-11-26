import { afterEach, describe, expect, it, vi } from "vitest";

import { checkinCrmHabilitado, obterConfigCrm } from "./config";

function ambienteBase() {
  vi.stubEnv("CRM_BASE_URL", "https://crm.exemplo.test/functions/v1");
  vi.stubEnv("CRM_API_KEY", "chave-de-teste");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("obterConfigCrm", () => {
  it.each([
    ["not defined", undefined],
    ["empty", ""],
  ])("uses 8000 ms as timeout when CRM_TIMEOUT_MS is %s", (_rotulo, valor) => {
    ambienteBase();
    vi.stubEnv("CRM_TIMEOUT_MS", valor);

    expect(obterConfigCrm()?.timeoutMs).toBe(8000);
  });

  it("uses the CRM_TIMEOUT_MS value when it is defined", () => {
    ambienteBase();
    vi.stubEnv("CRM_TIMEOUT_MS", "2500");

    expect(obterConfigCrm()).toEqual({
      baseUrl: "https://crm.exemplo.test/functions/v1",
      apiKey: "chave-de-teste",
      timeoutMs: 2500,
    });
  });

  it.each(["abc", "-1", "0"])("returns null when CRM_TIMEOUT_MS is %s", (valor) => {
    ambienteBase();
    vi.stubEnv("CRM_TIMEOUT_MS", valor);

    expect(obterConfigCrm()).toBeNull();
  });

  it.each(["CRM_BASE_URL", "CRM_API_KEY"])("returns null when %s is missing", (variavel) => {
    ambienteBase();
    vi.stubEnv(variavel, undefined);

    expect(obterConfigCrm()).toBeNull();
  });
});

describe("checkinCrmHabilitado", () => {
  it("is true when CRM_CHECKIN_ENABLED is exactly 'true'", () => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", "true");

    expect(checkinCrmHabilitado()).toBe(true);
  });

  it.each(["false", "1", "TRUE", ""])("is false when CRM_CHECKIN_ENABLED is '%s'", (valor) => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", valor);

    expect(checkinCrmHabilitado()).toBe(false);
  });

  it("is false when CRM_CHECKIN_ENABLED is not defined", () => {
    vi.stubEnv("CRM_CHECKIN_ENABLED", undefined);

    expect(checkinCrmHabilitado()).toBe(false);
  });
});
