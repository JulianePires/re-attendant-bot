import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, Fragment, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KioskCheckinFlow } from "./KioskCheckinFlow";

type Resultado =
  | {
      tipo: "encontrado";
      agendamento: { primeiroNome: string; hora: string; profissional: string };
    }
  | { tipo: "telefone_invalido"; mensagem: string }
  | { tipo: "indisponivel"; mensagem: string };

const mocks = vi.hoisted(() => ({
  localizarAgendamentoCheckin: vi.fn(),
  falar: vi.fn(),
  parar: vi.fn(),
}));

vi.mock("@/server/actions/checkin-crm", () => ({
  localizarAgendamentoCheckin: mocks.localizarAgendamentoCheckin,
}));

vi.mock("@/hooks/useTTS", () => ({
  useTTS: () => ({
    falar: mocks.falar,
    parar: mocks.parar,
    suportado: true,
  }),
}));

// Animação só atrasa a troca de telas; o fluxo é o mesmo sem ela.
vi.mock("framer-motion", () => {
  const propsDeAnimacao = [
    "initial",
    "animate",
    "exit",
    "transition",
    "variants",
    "whileTap",
    "whileHover",
    "layout",
    "layoutId",
  ];
  const motion = new Proxy(
    {},
    {
      get: (_alvo, tag: string) =>
        function MotionMock({
          children,
          ...props
        }: Record<string, unknown> & { children?: ReactNode }) {
          const resto = Object.fromEntries(
            Object.entries(props).filter(([k]) => !propsDeAnimacao.includes(k))
          );
          return createElement(tag, resto, children);
        },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children?: ReactNode }) =>
      createElement(Fragment, null, children),
  };
});

const MARIA: Resultado = {
  tipo: "encontrado",
  agendamento: { primeiroNome: "Maria", hora: "14:00", profissional: "Ana Lima" },
};

const MENSAGEM_CONFIRMACAO =
  "Maria, seu agendamento é às 14:00 com Ana Lima. Confirme para registrar sua chegada.";

const MENSAGEM_INDISPONIVEL =
  "Não foi possível concluir seu check-in agora. Por favor, procure a recepção.";

let user: ReturnType<typeof userEvent.setup>;

async function clicar(nome: string) {
  await user.click(await screen.findByRole("button", { name: nome }));
}

// Chamado só depois de a tela do telefone aparecer: o teclado já está montado.
async function teclar(digitos: string) {
  for (const d of digitos) {
    await user.click(screen.getByRole("button", { name: d }));
  }
}

async function irParaTelefone() {
  await clicar("Toque para iniciar");
  await clicar("Tenho consulta agendada");
  await screen.findByText(/Informe seu telefone/);
}

async function irParaConfirmacao() {
  mocks.localizarAgendamentoCheckin.mockResolvedValue(MARIA);
  await irParaTelefone();
  await teclar("11987654321");
  await clicar("Buscar");
  await screen.findByText(MENSAGEM_CONFIRMACAO);
}

function campoTelefone() {
  return screen.getByLabelText("Telefone");
}

describe("KioskCheckinFlow", { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup({ delay: null });
  });

  it("shows the appointment confirmation when patient finds today's appointment (cenário 1)", async () => {
    mocks.localizarAgendamentoCheckin.mockResolvedValue(MARIA);

    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar("11987654321");
    await clicar("Buscar");

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(MENSAGEM_CONFIRMACAO);
    expect(screen.getByRole("button", { name: "Confirmar chegada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Não sou eu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar ao início" })).toBeInTheDocument();
    expect(mocks.localizarAgendamentoCheckin).toHaveBeenCalledWith("11987654321");
    expect(screen.queryByText(/Maria Souza/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pilates/)).not.toBeInTheDocument();
  });

  it.each([
    ["0 dígitos", ""],
    ["9 dígitos", "119876543"],
  ])("rejects search with %s without calling the CRM (cenário 2)", async (_rotulo, digitos) => {
    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar(digitos);
    await clicar("Buscar");

    expect(await screen.findByRole("alert")).toHaveTextContent("Digite o telefone com DDD.");
    expect(mocks.localizarAgendamentoCheckin).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe seu telefone/)).toBeInTheDocument();
  });

  it("calls the CRM when phone has exactly 10 digits (cenário 2, limite)", async () => {
    mocks.localizarAgendamentoCheckin.mockResolvedValue(MARIA);

    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar("1198765432");
    await clicar("Buscar");

    await waitFor(() =>
      expect(mocks.localizarAgendamentoCheckin).toHaveBeenCalledWith("1198765432")
    );
    expect(mocks.localizarAgendamentoCheckin).toHaveBeenCalledTimes(1);
  });

  it("shows corrected masked phone after erasing a digit and typing another (cenário 3)", async () => {
    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar("1198765432");
    await clicar("Apagar");
    await teclar("21");

    expect(campoTelefone()).toHaveTextContent("(11) 98765-4321");
    expect(mocks.localizarAgendamentoCheckin).not.toHaveBeenCalled();
  });

  it("returns to an empty phone screen when patient says it is not them (cenário 4)", async () => {
    render(<KioskCheckinFlow />);
    await irParaConfirmacao();

    await clicar("Não sou eu");

    await screen.findByText(/Informe seu telefone/);
    expect(campoTelefone().textContent?.trim()).toBe("");
  });

  it("returns to idle and clears the phone when patient gives up (cenário 5)", async () => {
    render(<KioskCheckinFlow />);
    await irParaConfirmacao();

    await clicar("Voltar ao início");

    expect(await screen.findByRole("button", { name: "Toque para iniciar" })).toBeInTheDocument();
    await clicar("Toque para iniciar");
    await clicar("Tenho consulta agendada");
    await screen.findByText(/Informe seu telefone/);
    expect(campoTelefone().textContent?.trim()).toBe("");
  });

  it("calls the CRM only once on a double tap of Buscar (cenário 6)", async () => {
    mocks.localizarAgendamentoCheckin.mockReturnValue(new Promise(() => {}));

    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar("11987654321");
    const buscar = screen.getByRole("button", { name: "Buscar" });
    await user.click(buscar);
    await user.click(buscar);

    expect(await screen.findByText("Procurando seu agendamento...")).toBeInTheDocument();
    expect(mocks.localizarAgendamentoCheckin).toHaveBeenCalledTimes(1);
  });

  it("shows the unavailable message in an alert with a way back when the check-in is not available yet (cenário 7)", async () => {
    mocks.localizarAgendamentoCheckin.mockResolvedValue({
      tipo: "indisponivel",
      mensagem: MENSAGEM_INDISPONIVEL,
    } satisfies Resultado);

    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar("11987654321");
    await clicar("Buscar");

    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAGEM_INDISPONIVEL);
    expect(screen.getByRole("button", { name: "Voltar ao início" })).toBeInTheDocument();
  });

  it("speaks the patient's first name on confirmation without leaking the phone (cenário 8, RF-001.21)", async () => {
    render(<KioskCheckinFlow />);
    await irParaConfirmacao();

    await waitFor(() => expect(mocks.falar).toHaveBeenCalled());
    const textos = mocks.falar.mock.calls.map((c) => String(c[0]));
    expect(textos.some((t) => t.includes("Maria"))).toBe(true);
    for (const t of textos) {
      expect(t).not.toContain("11987654321");
      expect(t).not.toContain("98765");
    }
  });

  it("ignores a second tap in the same tick", async () => {
    mocks.localizarAgendamentoCheckin.mockReturnValue(new Promise(() => {}));

    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar("11987654321");
    const buscar = screen.getByRole("button", { name: "Buscar" });
    fireEvent.click(buscar);
    fireEvent.click(buscar);

    await screen.findByText("Procurando seu agendamento...");
    expect(mocks.localizarAgendamentoCheckin).toHaveBeenCalledTimes(1);
  });

  it("hides Voltar ao início while searching", async () => {
    mocks.localizarAgendamentoCheckin.mockReturnValue(new Promise(() => {}));

    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar("11987654321");
    await clicar("Buscar");

    await screen.findByText("Procurando seu agendamento...");
    expect(screen.queryByRole("button", { name: "Voltar ao início" })).not.toBeInTheDocument();
  });

  it("returns to idle from the phone screen", async () => {
    render(<KioskCheckinFlow />);
    await irParaTelefone();

    await clicar("Voltar ao início");

    expect(await screen.findByRole("button", { name: "Toque para iniciar" })).toBeInTheDocument();
  });

  it("offers Voltar ao início on the home screen and returns to idle", async () => {
    render(<KioskCheckinFlow />);
    await clicar("Toque para iniciar");
    await screen.findByRole("button", { name: "Tenho consulta agendada" });

    await clicar("Voltar ao início");

    expect(await screen.findByRole("button", { name: "Toque para iniciar" })).toBeInTheDocument();
  });

  it("does not show the previous patient's data after going back and searching again", async () => {
    render(<KioskCheckinFlow />);
    await irParaConfirmacao();
    await clicar("Voltar ao início");
    mocks.localizarAgendamentoCheckin.mockReturnValue(new Promise(() => {}));

    await irParaTelefone();
    await teclar("11911112222");
    await clicar("Buscar");

    await screen.findByText("Procurando seu agendamento...");
    expect(screen.queryByText(/Maria/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ana Lima/)).not.toBeInTheDocument();
  });

  it("shows the technical message with a way back when the search call itself fails", async () => {
    mocks.localizarAgendamentoCheckin.mockRejectedValue(new Error("network"));

    render(<KioskCheckinFlow />);
    await irParaTelefone();
    await teclar("11987654321");
    await clicar("Buscar");

    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAGEM_INDISPONIVEL);
    expect(screen.getByRole("button", { name: "Voltar ao início" })).toBeInTheDocument();
    expect(screen.queryByText("Procurando seu agendamento...")).not.toBeInTheDocument();
  });

  it("keeps at most 11 digits when the number does not start with 55", async () => {
    render(<KioskCheckinFlow />);
    await irParaTelefone();

    await teclar("119876543210");

    expect(campoTelefone()).toHaveTextContent("(11) 98765-4321");
  });

  it("accepts up to 13 digits when the number starts with 55", async () => {
    render(<KioskCheckinFlow />);
    await irParaTelefone();

    await teclar("5511987654321");

    expect(campoTelefone()).toHaveTextContent("+55 (11) 98765-4321");
  });

  it("ignores digits beyond 13", async () => {
    render(<KioskCheckinFlow />);
    await irParaTelefone();

    await teclar("55119876543219999");

    const digitos = campoTelefone().textContent?.replace(/\D/g, "");
    expect(digitos).toBe("5511987654321");
  });
});
