import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(() => Promise.resolve("message-id")),
  sendPasswordChangedEmail: vi.fn(() => Promise.resolve("message-id")),
}));

vi.mock("./service", () => mocks);

import { betterAuthEmailAdapter } from "./adapter";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("betterAuthEmailAdapter.sendPasswordResetEmail", () => {
  it("repassa o nome do usuário para o e-mail de redefinição", async () => {
    await betterAuthEmailAdapter.sendPasswordResetEmail("ana@clinica.com", {
      url: "https://app.local/redefinir-senha?token=abc",
      token: "abc",
      name: "Ana Souza",
    });

    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      "ana@clinica.com",
      "https://app.local/redefinir-senha?token=abc",
      "Ana Souza"
    );
  });

  it("envia sem nome quando o usuário não tem nome", async () => {
    await betterAuthEmailAdapter.sendPasswordResetEmail("sem-nome@clinica.com", {
      url: "https://app.local/reset",
      token: "xyz",
      name: null,
    });

    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      "sem-nome@clinica.com",
      "https://app.local/reset",
      undefined
    );
  });

  it("propaga erros do serviço de e-mail", async () => {
    mocks.sendPasswordResetEmail.mockRejectedValueOnce(new Error("SMTP indisponível"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      betterAuthEmailAdapter.sendPasswordResetEmail("ana@clinica.com", {
        url: "https://app.local/reset",
        token: "abc",
      })
    ).rejects.toThrow("SMTP indisponível");
  });
});
