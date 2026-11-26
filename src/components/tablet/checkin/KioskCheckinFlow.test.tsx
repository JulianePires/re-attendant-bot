import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, Fragment, type ReactNode } from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KioskCheckinFlow } from "./KioskCheckinFlow";

type Resultado =
  | {
      tipo: "encontrado";
      agendamento: { primeiroNome: string; hora: string; profissional: string };
    }
  | { tipo: "telefone_invalido"; mensagem: string }
  | { tipo: "indisponivel"; mensagem: string }
  | {
      tipo:
        | "nao_encontrado"
        | "fora_da_janela"
        | "sem_agendamento"
        | "chegada_ja_registrada"
        | "impedimento";
      mensagem: string;
    };

const mocks = vi.hoisted(() => ({
  localizarAgendamentoCheckin: vi.fn(),
  registrarEEntrarNaFila: vi.fn(),
  falar: vi.fn(),
  parar: vi.fn(),
}));

vi.mock("@/server/actions/checkin-crm", () => ({
  localizarAgendamentoCheckin: mocks.localizarAgendamentoCheckin,
}));

vi.mock("@/server/actions/atendimento", () => ({
  registrarEEntrarNaFila: mocks.registrarEEntrarNaFila,
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
  // Um componente por tag: se cada acesso criasse um tipo novo, todo re-render remontaria a tela e perderia o estado.
  const porTag = new Map<string, (props: Record<string, unknown>) => ReactNode>();
  const motion = new Proxy(
    {},
    {
      get: (_alvo, tag: string) => {
        const existente = porTag.get(tag);
        if (existente) return existente;
        const criado = function MotionMock({
          children,
          ...props
        }: Record<string, unknown> & { children?: ReactNode }) {
          const resto = Object.fromEntries(
            Object.entries(props).filter(([k]) => !propsDeAnimacao.includes(k))
          );
          return createElement(tag, resto, children);
        };
        porTag.set(tag, criado);
        return criado;
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
  await user.click(await screen.findByRole("button", { name: nome, hidden: true }));
}

// Chamado só depois de a tela do telefone aparecer: o teclado já está montado.
async function teclar(digitos: string) {
  // getByRole calcula nome e visibilidade de todos os botões a cada tecla (lento no jsdom); texto + seletor é equivalente aqui.
  for (const d of digitos) {
    fireEvent.click(screen.getByText(d, { selector: "button" }));
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

describe("KioskCheckinFlow: respostas sem agendamento e inatividade", { timeout: 15000 }, () => {
  const MSG = {
    nao_encontrado: "Não encontrei nenhum cadastro com esse número.",
    fora_da_janela: "Sua consulta é às 17:00. O check-in abre às 16:00.",
    sem_agendamento: "Não encontrei agendamento para agora.",
    chegada_ja_registrada: "Sua chegada já foi registrada.",
    impedimento: "Faltou alguma informação para eu concluir.",
  } as const;

  const botao = (nome: string) => screen.queryByRole("button", { name: nome, hidden: true });

  // Helpers rápidos: texto + seletor, sem calcular papéis de todos os botões.
  async function tocar(nome: string) {
    fireEvent.click(screen.getByText(nome, { selector: "button" }));
  }

  // A promessa da action resolve dentro de act: o React renderiza sem depender do agendador preso aos timers falsos.
  async function buscar() {
    const botaoBuscar = screen.getByText("Buscar", { selector: "button" });
    await act(async () => {
      fireEvent.click(botaoBuscar);
    });
  }

  async function abrirTelefone() {
    await tocar("Toque para iniciar");
    await tocar("Tenho consulta agendada");
    screen.getByText(/Informe seu telefone/);
  }

  function digitar(digitos: string) {
    for (const d of digitos) fireEvent.click(screen.getByText(d, { selector: "button" }));
  }

  async function buscarCom(resultado: Resultado) {
    mocks.localizarAgendamentoCheckin.mockResolvedValue(resultado);
    render(<KioskCheckinFlow />);
    await abrirTelefone();
    digitar("11900000000");
    await buscar();
  }

  async function avancar(ms: number) {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  }

  // Preenche "Seu nome" e envia; a promessa da action resolve dentro de act.
  async function chamarProfissional(nome: string) {
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: nome } });
    const enviar = screen.getByText("Chamar um profissional", { selector: "button" });
    await act(async () => {
      fireEvent.click(enviar);
    });
  }

  function estaNoInicio() {
    return screen.queryByText("Toque para iniciar", { selector: "button" }) !== null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows not-found message in an alert with Tentar outro telefone and Voltar ao início", async () => {
    await buscarCom({ tipo: "nao_encontrado", mensagem: MSG.nao_encontrado });

    expect(screen.getByRole("alert")).toHaveTextContent(MSG.nao_encontrado);
    expect(botao("Tentar outro telefone")).toBeInTheDocument();
    expect(botao("Falar com um profissional")).toBeInTheDocument();
    expect(botao("Voltar ao início")).toBeInTheDocument();
    expect(screen.queryByText(/paciente_nao_encontrado/)).not.toBeInTheDocument();
  });

  it("returns to an empty phone screen when patient chooses Tentar outro telefone", async () => {
    await buscarCom({ tipo: "nao_encontrado", mensagem: MSG.nao_encontrado });
    screen.getByRole("alert");

    await tocar("Tentar outro telefone");

    screen.getByText(/Informe seu telefone/);
    expect(campoTelefone().textContent?.trim()).toBe("");
  });

  it("offers only Voltar ao início when the appointment is outside the check-in window", async () => {
    await buscarCom({ tipo: "fora_da_janela", mensagem: MSG.fora_da_janela });

    expect(screen.getByRole("alert")).toHaveTextContent(MSG.fora_da_janela);
    expect(botao("Voltar ao início")).toBeInTheDocument();
    expect(botao("Tentar outro telefone")).not.toBeInTheDocument();
    expect(botao("Falar com um profissional")).not.toBeInTheDocument();
  });

  it("offers the three options when there is no appointment for now, without joining the normal queue", async () => {
    await buscarCom({ tipo: "sem_agendamento", mensagem: MSG.sem_agendamento });

    expect(screen.getByRole("alert")).toHaveTextContent(MSG.sem_agendamento);
    expect(botao("Tentar outro telefone")).toBeInTheDocument();
    expect(botao("Falar com um profissional")).toBeInTheDocument();
    expect(botao("Voltar ao início")).toBeInTheDocument();
    expect(botao("Entrar na fila pelo nome")).not.toBeInTheDocument();
  });

  it("offers Falar com um profissional on the home screen", async () => {
    render(<KioskCheckinFlow />);
    await tocar("Toque para iniciar");

    expect(botao("Tenho consulta agendada")).toBeInTheDocument();
    expect(botao("Falar com um profissional")).toBeInTheDocument();
  });

  it("calls a professional as urgent without appointment after not-found, without confirming arrival in the CRM", async () => {
    mocks.registrarEEntrarNaFila.mockResolvedValue({ success: true });
    await buscarCom({ tipo: "nao_encontrado", mensagem: MSG.nao_encontrado });

    await tocar("Falar com um profissional");
    await chamarProfissional("João Pereira");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Tudo certo! Aguarde que logo um profissional chegará."
    );
    expect(mocks.registrarEEntrarNaFila).toHaveBeenCalledWith({
      nome: "João Pereira",
      tipoChamada: "urgente",
      semAgendamento: true,
    });
    expect(mocks.localizarAgendamentoCheckin).toHaveBeenCalledTimes(1);
  });

  it("calls a professional from the home screen without querying the CRM", async () => {
    mocks.registrarEEntrarNaFila.mockResolvedValue({ success: true });
    render(<KioskCheckinFlow />);
    await tocar("Toque para iniciar");

    await tocar("Falar com um profissional");
    await chamarProfissional("João Pereira");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Tudo certo! Aguarde que logo um profissional chegará."
    );
    expect(mocks.registrarEEntrarNaFila).toHaveBeenCalledWith({
      nome: "João Pereira",
      tipoChamada: "urgente",
      semAgendamento: true,
    });
    expect(mocks.localizarAgendamentoCheckin).not.toHaveBeenCalled();
  });

  it("returns to idle 10 s after the professional was called", async () => {
    mocks.registrarEEntrarNaFila.mockResolvedValue({ success: true });
    await buscarCom({ tipo: "sem_agendamento", mensagem: MSG.sem_agendamento });
    await tocar("Falar com um profissional");
    await chamarProfissional("João Pereira");

    await avancar(9_999);
    expect(estaNoInicio()).toBe(false);

    await avancar(1);
    expect(estaNoInicio()).toBe(true);
  });

  it("rejects a one-character name without calling the queue", async () => {
    render(<KioskCheckinFlow />);
    await tocar("Toque para iniciar");
    await tocar("Falar com um profissional");

    await chamarProfissional("J");

    expect(screen.getByRole("alert")).toHaveTextContent("O nome deve ter pelo menos 2 caracteres.");
    expect(mocks.registrarEEntrarNaFila).not.toHaveBeenCalled();
  });

  it("ignores a late queue response after the kiosk went back to the start", async () => {
    let resolverFila: (valor: { success: boolean }) => void = () => {};
    mocks.registrarEEntrarNaFila.mockReturnValue(
      new Promise((resolve) => {
        resolverFila = resolve;
      })
    );
    await buscarCom({ tipo: "sem_agendamento", mensagem: MSG.sem_agendamento });
    await tocar("Falar com um profissional");
    await chamarProfissional("João Pereira");
    expect(mocks.registrarEEntrarNaFila).toHaveBeenCalledTimes(1);

    await tocar("Voltar ao início");
    await act(async () => {
      resolverFila({ success: true });
    });

    expect(estaNoInicio()).toBe(true);
    expect(
      screen.queryByText("Tudo certo! Aguarde que logo um profissional chegará.")
    ).not.toBeInTheDocument();
  });

  it("offers only Voltar ao início on a blocking response", async () => {
    await buscarCom({ tipo: "impedimento", mensagem: MSG.impedimento });

    expect(screen.getByRole("alert")).toHaveTextContent(MSG.impedimento);
    expect(botao("Voltar ao início")).toBeInTheDocument();
    expect(botao("Tentar outro telefone")).not.toBeInTheDocument();
    expect(botao("Falar com um profissional")).not.toBeInTheDocument();
  });

  it("shows the arrival-registered screen without asking for confirmation", async () => {
    await buscarCom({ tipo: "chegada_ja_registrada", mensagem: MSG.chegada_ja_registrada });

    expect(screen.getByRole("status")).toHaveTextContent(MSG.chegada_ja_registrada);
    expect(botao("Confirmar chegada")).not.toBeInTheDocument();
  });

  it("returns to idle exactly 10 s after the arrival-registered screen", async () => {
    await buscarCom({ tipo: "chegada_ja_registrada", mensagem: MSG.chegada_ja_registrada });
    screen.getByRole("status");

    await avancar(9_999);
    expect(screen.getByRole("status")).toHaveTextContent(MSG.chegada_ja_registrada);
    expect(estaNoInicio()).toBe(false);

    await avancar(1);
    expect(estaNoInicio()).toBe(true);
  });

  it("returns to idle exactly 20 s after a business error", async () => {
    await buscarCom({ tipo: "nao_encontrado", mensagem: MSG.nao_encontrado });
    screen.getByRole("alert");

    await avancar(19_999);
    expect(screen.getByRole("alert")).toHaveTextContent(MSG.nao_encontrado);
    expect(estaNoInicio()).toBe(false);

    await avancar(1);
    expect(estaNoInicio()).toBe(true);
  });

  describe.each([
    [
      "do telefone",
      async () => {
        render(<KioskCheckinFlow />);
        await abrirTelefone();
        digitar("1198");
      },
    ],
    [
      "de confirmação do agendamento",
      async () => {
        mocks.localizarAgendamentoCheckin.mockResolvedValue(MARIA);
        render(<KioskCheckinFlow />);
        await abrirTelefone();
        digitar("11987654321");
        await buscar();
        screen.getByText(MENSAGEM_CONFIRMACAO);
      },
    ],
  ])("inactivity on the screen %s", (_tela, prepararTela) => {
    it("returns to idle at exactly 30 s and discards the phone", async () => {
      await prepararTela();

      await avancar(29_999);
      expect(estaNoInicio()).toBe(false);

      await avancar(1);
      expect(estaNoInicio()).toBe(true);
      await abrirTelefone();
      expect(campoTelefone().textContent?.trim()).toBe("");
    });
  });

  it("restarts the 30 s countdown on a touch", async () => {
    render(<KioskCheckinFlow />);
    await abrirTelefone();

    await avancar(20_000);
    fireEvent.click(screen.getByText("1", { selector: "button" }));
    await avancar(25_000);

    expect(screen.getByText(/Informe seu telefone/)).toBeInTheDocument();
    expect(estaNoInicio()).toBe(false);
  });

  it.each([
    ["nao_encontrado", MSG.nao_encontrado],
    ["sem_agendamento", MSG.sem_agendamento],
  ] as const)("never shows the raw reason on screen for %s", async (tipo, mensagem) => {
    await buscarCom({ tipo, mensagem });
    screen.getByRole("alert");

    expect(
      screen.queryByText(/paciente_nao_encontrado|sem_agendamento_agora|dados_invalidos/)
    ).not.toBeInTheDocument();
  });

  it("shows the technical message when the queue action rejects", async () => {
    mocks.registrarEEntrarNaFila.mockRejectedValue(new Error("falha"));
    render(<KioskCheckinFlow />);
    await tocar("Toque para iniciar");
    await tocar("Falar com um profissional");

    await chamarProfissional("João Pereira");

    expect(screen.getByRole("alert")).toHaveTextContent(MENSAGEM_INDISPONIVEL);
    expect(botao("Voltar ao início")).toBeInTheDocument();
  });

  it("sends the trimmed name to the queue", async () => {
    mocks.registrarEEntrarNaFila.mockResolvedValue({ success: true });
    render(<KioskCheckinFlow />);
    await tocar("Toque para iniciar");
    await tocar("Falar com um profissional");

    await chamarProfissional("  João Pereira  ");

    expect(mocks.registrarEEntrarNaFila).toHaveBeenCalledWith({
      nome: "João Pereira",
      tipoChamada: "urgente",
      semAgendamento: true,
    });
  });

  it("offers no Entrar na fila pelo nome on any no-appointment screen", async () => {
    render(<KioskCheckinFlow />);
    await tocar("Toque para iniciar");
    expect(botao("Entrar na fila pelo nome")).not.toBeInTheDocument();
    await tocar("Falar com um profissional");
    expect(botao("Entrar na fila pelo nome")).not.toBeInTheDocument();
    cleanup();

    await buscarCom({ tipo: "nao_encontrado", mensagem: MSG.nao_encontrado });
    expect(botao("Entrar na fila pelo nome")).not.toBeInTheDocument();
  });

  it("discards the typed name after 30 s on the call-a-professional screen", async () => {
    render(<KioskCheckinFlow />);
    await tocar("Toque para iniciar");
    await tocar("Falar com um profissional");
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana Costa" } });

    await avancar(29_999);
    expect(estaNoInicio()).toBe(false);
    await avancar(1);
    expect(estaNoInicio()).toBe(true);

    await tocar("Toque para iniciar");
    await tocar("Falar com um profissional");
    expect(screen.getByLabelText("Seu nome")).toHaveValue("");
  });

  it("restarts the 30 s countdown when typing the name", async () => {
    render(<KioskCheckinFlow />);
    await tocar("Toque para iniciar");
    await tocar("Falar com um profissional");

    await avancar(20_000);
    fireEvent.input(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    await avancar(25_000);

    expect(screen.getByLabelText("Seu nome")).toBeInTheDocument();
    expect(estaNoInicio()).toBe(false);
  });
});
