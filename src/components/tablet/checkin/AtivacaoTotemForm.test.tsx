import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AtivacaoTotemForm from "./AtivacaoTotemForm";

const mocks = vi.hoisted(() => ({
  ativarTotemCheckin: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/server/actions/checkin-crm", () => ({
  ativarTotemCheckin: mocks.ativarTotemCheckin,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

const CHAVE = "chave-da-clinica-com-32-caracteres!!";
const MENSAGEM_INDISPONIVEL =
  "Não foi possível concluir seu check-in agora. Por favor, procure a recepção.";

function renderizar() {
  const user = userEvent.setup({ delay: null });
  render(<AtivacaoTotemForm />);
  return { user };
}

async function digitarEAtivar(user: ReturnType<typeof userEvent.setup>, chave: string) {
  await user.type(screen.getByLabelText("Chave de acesso"), chave);
  await user.click(screen.getByRole("button", { name: "Ativar" }));
}

describe("AtivacaoTotemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the activation action with the typed key (Dispositivo autorizado na tela de ativação)", async () => {
    mocks.ativarTotemCheckin.mockResolvedValue({ ok: true });
    const { user } = renderizar();

    await digitarEAtivar(user, CHAVE);

    await waitFor(() => expect(mocks.ativarTotemCheckin).toHaveBeenCalledWith(CHAVE));
    expect(mocks.ativarTotemCheckin).toHaveBeenCalledTimes(1);
  });

  it("navigates to /recepcao-crm without the key in the URL or visible text (Dispositivo autorizado na tela de ativação)", async () => {
    mocks.ativarTotemCheckin.mockResolvedValue({ ok: true });
    const { user } = renderizar();

    await digitarEAtivar(user, CHAVE);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/recepcao-crm"));
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(String(mocks.replace.mock.calls[0][0])).not.toContain(CHAVE);
    expect(document.body.textContent).not.toContain(CHAVE);
  });

  it("shows the invalid key message and does not navigate (Chave errada na tela de ativação)", async () => {
    mocks.ativarTotemCheckin.mockResolvedValue({
      ok: false,
      mensagem: "Chave de acesso inválida.",
    });
    const { user } = renderizar();

    await digitarEAtivar(user, "chave-errada");

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Chave de acesso inválida.");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("keeps the field available to retry after a wrong key (Chave errada na tela de ativação)", async () => {
    mocks.ativarTotemCheckin.mockResolvedValueOnce({
      ok: false,
      mensagem: "Chave de acesso inválida.",
    });
    mocks.ativarTotemCheckin.mockResolvedValueOnce({ ok: true });
    const { user } = renderizar();

    await digitarEAtivar(user, "chave-errada");
    await screen.findByRole("alert");

    const campo = screen.getByLabelText("Chave de acesso");
    expect(campo).toBeEnabled();
    expect(screen.getByRole("button", { name: "Ativar" })).toBeEnabled();

    await user.clear(campo);
    await user.type(campo, CHAVE);
    await user.click(screen.getByRole("button", { name: "Ativar" }));

    await waitFor(() => expect(mocks.ativarTotemCheckin).toHaveBeenLastCalledWith(CHAVE));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/recepcao-crm"));
  });

  it("does not call the action when the key field is empty", async () => {
    const { user } = renderizar();

    await user.click(screen.getByRole("button", { name: "Ativar" }));
    fireEvent.submit(screen.getByRole("form", { name: "Ativar totem" }));

    expect(mocks.ativarTotemCheckin).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("calls the action only once when submitted twice while pending", async () => {
    let resolver: (valor: { ok: true }) => void = () => {};
    mocks.ativarTotemCheckin.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );
    const { user } = renderizar();

    await user.type(screen.getByLabelText("Chave de acesso"), CHAVE);
    const botao = screen.getByRole("button", { name: "Ativar" });
    await user.click(botao);
    await user.click(botao);
    fireEvent.submit(screen.getByRole("form", { name: "Ativar totem" }));

    expect(mocks.ativarTotemCheckin).toHaveBeenCalledTimes(1);

    resolver({ ok: true });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledTimes(1));
  });

  it("shows the unavailable message and does not navigate when the action rejects", async () => {
    mocks.ativarTotemCheckin.mockRejectedValue(new Error("network down"));
    const { user } = renderizar();

    await digitarEAtivar(user, CHAVE);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(MENSAGEM_INDISPONIVEL);
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("renders the key field as password with autocomplete off", () => {
    renderizar();

    const campo = screen.getByLabelText("Chave de acesso");
    expect(campo).toHaveAttribute("type", "password");
    expect(campo).toHaveAttribute("autocomplete", "off");
  });
});
