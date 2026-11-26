import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ATENDIMENTOS_DIA_QUERY_KEY,
  FILA_ATIVA_QUERY_KEY,
  useRealtimeQueue,
} from "./useRealtimeQueue";

type Handler = (payload: { new?: unknown; old?: unknown }) => void;

// vi.mock é içado para o topo do arquivo; os mocks precisam ser criados
// com vi.hoisted para já existirem quando a factory for executada.
const mocks = vi.hoisted(() => {
  const handlers: Record<string, Handler | undefined> = {};

  const channel = {
    on: vi.fn((_: string, filter: { event: string }, callback: Handler) => {
      handlers[filter.event] = callback;
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };

  const supabase = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve("ok")),
  };

  return { handlers, channel, supabase };
});

vi.mock("@/lib/supabase-client", () => ({
  supabase: mocks.supabase,
  CANAL_FILA: "public:Atendimento",
}));

type ItemFila = { id: string; nomePaciente: string; tipoChamada: string; status: string };

function atendimento(overrides: Partial<ItemFila> & { id: string; criadoEm: string }) {
  return {
    nomePaciente: "Ana",
    tipoChamada: "normal",
    status: "aguardando",
    finalizadoEm: null,
    ...overrides,
  };
}

function HookHarness() {
  useRealtimeQueue();
  return null;
}

function renderHook(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <HookHarness />
    </QueryClientProvider>
  );
}

function filaAtiva(queryClient: QueryClient) {
  return queryClient.getQueryData<ItemFila[]>(FILA_ATIVA_QUERY_KEY) ?? [];
}

beforeEach(() => {
  for (const key of Object.keys(mocks.handlers)) delete mocks.handlers[key];
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("useRealtimeQueue", () => {
  it("assina INSERT, UPDATE e DELETE na tabela atendimento", async () => {
    renderHook(new QueryClient());

    await waitFor(() => expect(mocks.channel.subscribe).toHaveBeenCalled());

    const eventos = mocks.channel.on.mock.calls.map(([tipo, filtro]) => ({ tipo, ...filtro }));
    expect(eventos).toEqual(
      ["INSERT", "UPDATE", "DELETE"].map((event) => ({
        tipo: "postgres_changes",
        event,
        schema: "public",
        table: "atendimento",
      }))
    );
  });

  it("adiciona o atendimento à fila ao receber INSERT", async () => {
    const queryClient = new QueryClient();
    renderHook(queryClient);
    await waitFor(() => expect(mocks.handlers.INSERT).toBeTypeOf("function"));

    mocks.handlers.INSERT?.({
      new: atendimento({ id: "a1", nomePaciente: "Ana", criadoEm: "2026-03-17T10:00:00.000Z" }),
    });

    expect(filaAtiva(queryClient)).toEqual([
      expect.objectContaining({ id: "a1", nomePaciente: "Ana", status: "aguardando" }),
    ]);
  });

  it("ordena urgentes primeiro e depois por ordem de chegada", async () => {
    const queryClient = new QueryClient();
    renderHook(queryClient);
    await waitFor(() => expect(mocks.handlers.INSERT).toBeTypeOf("function"));

    mocks.handlers.INSERT?.({
      new: atendimento({ id: "n1", criadoEm: "2026-03-17T10:00:00.000Z" }),
    });
    mocks.handlers.INSERT?.({
      new: atendimento({ id: "n2", criadoEm: "2026-03-17T10:01:00.000Z" }),
    });
    mocks.handlers.INSERT?.({
      new: atendimento({
        id: "u1",
        tipoChamada: "URGENTE",
        criadoEm: "2026-03-17T10:02:00.000Z",
      }),
    });

    expect(filaAtiva(queryClient).map((item) => item.id)).toEqual(["u1", "n1", "n2"]);
    expect(filaAtiva(queryClient)[0].tipoChamada).toBe("urgente");
  });

  it("ignora INSERT sem id", async () => {
    const queryClient = new QueryClient();
    renderHook(queryClient);
    await waitFor(() => expect(mocks.handlers.INSERT).toBeTypeOf("function"));

    mocks.handlers.INSERT?.({ new: { nomePaciente: "Sem id" } });

    expect(filaAtiva(queryClient)).toHaveLength(0);
  });

  it("remove da fila e sincroniza o histórico quando o atendimento é finalizado", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(FILA_ATIVA_QUERY_KEY, [
      atendimento({ id: "u1", tipoChamada: "urgente", criadoEm: "2026-03-17T10:05:00.000Z" }),
    ]);

    renderHook(queryClient);
    await waitFor(() => expect(mocks.handlers.UPDATE).toBeTypeOf("function"));

    mocks.handlers.UPDATE?.({
      new: {
        ...atendimento({ id: "u1", tipoChamada: "urgente", criadoEm: "2026-03-17T10:05:00.000Z" }),
        status: "finalizado",
        finalizadoEm: "2026-03-17T10:12:00.000Z",
      },
    });

    expect(filaAtiva(queryClient)).toHaveLength(0);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ATENDIMENTOS_DIA_QUERY_KEY,
      refetchType: "none",
    });
  });

  it("não sincroniza o histórico em UPDATE que mantém o atendimento aguardando", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(queryClient);
    await waitFor(() => expect(mocks.handlers.UPDATE).toBeTypeOf("function"));

    mocks.handlers.UPDATE?.({
      new: atendimento({
        id: "a1",
        nomePaciente: "Ana Souza",
        criadoEm: "2026-03-17T10:00:00.000Z",
      }),
    });

    expect(filaAtiva(queryClient)).toEqual([
      expect.objectContaining({ id: "a1", nomePaciente: "Ana Souza" }),
    ]);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("remove da fila e sincroniza o histórico ao receber DELETE", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(FILA_ATIVA_QUERY_KEY, [
      atendimento({ id: "a1", criadoEm: "2026-03-17T10:00:00.000Z" }),
      atendimento({ id: "a2", criadoEm: "2026-03-17T10:01:00.000Z" }),
    ]);

    renderHook(queryClient);
    await waitFor(() => expect(mocks.handlers.DELETE).toBeTypeOf("function"));

    mocks.handlers.DELETE?.({ old: { id: "a1" } });

    expect(filaAtiva(queryClient).map((item) => item.id)).toEqual(["a2"]);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ATENDIMENTOS_DIA_QUERY_KEY,
      refetchType: "none",
    });
  });

  it("remove o canal ao desmontar", async () => {
    const { unmount } = renderHook(new QueryClient());
    await waitFor(() => expect(mocks.channel.subscribe).toHaveBeenCalled());

    unmount();

    expect(mocks.supabase.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });
});
