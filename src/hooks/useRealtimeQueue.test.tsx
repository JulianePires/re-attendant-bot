import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ATENDIMENTOS_DIA_QUERY_KEY,
  FILA_ATIVA_QUERY_KEY,
  useRealtimeQueue,
} from "./useRealtimeQueue";

type Handler = (payload: { new: unknown }) => void;

let insertHandler: Handler | null = null;
let updateHandler: Handler | null = null;

const channelMock = {
  on: vi.fn((_: string, filter: { event: string }, callback: Handler) => {
    if (filter.event === "INSERT") insertHandler = callback;
    if (filter.event === "UPDATE") updateHandler = callback;
    return channelMock;
  }),
  subscribe: vi.fn(() => channelMock),
};

const supabaseMock = {
  channel: vi.fn(() => channelMock),
  removeChannel: vi.fn(),
};

const tocarAlertaUrgente = vi.fn();
const pararAlertaUrgente = vi.fn();
const tocarNotificacao = vi.fn();

vi.mock("@/lib/supabase-client", () => ({
  supabase: supabaseMock,
  CANAL_FILA: "fila-atendimento",
}));

vi.mock("@/hooks/useCampainha", () => ({
  useCampainha: () => ({ tocarAlertaUrgente, pararAlertaUrgente, tocarNotificacao }),
}));

function HookHarness() {
  useRealtimeQueue();
  return null;
}

beforeEach(() => {
  insertHandler = null;
  updateHandler = null;
  vi.clearAllMocks();
});

describe("useRealtimeQueue", () => {
  it("toca notificacao e invalida fila ao receber INSERT normal", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>
    );

    await waitFor(() => expect(insertHandler).toBeTypeOf("function"));

    insertHandler?.({
      new: {
        id: "a1",
        pacienteId: "p1",
        paciente: { id: "p1", name: "Ana" },
        tipoChamada: "normal",
        status: "aguardando",
        criadoEm: new Date("2026-03-17T10:00:00.000Z"),
        finalizadoEm: null,
      },
    });

    const fila = queryClient.getQueryData<unknown[]>(FILA_ATIVA_QUERY_KEY) ?? [];

    expect(fila).toHaveLength(1);
    expect(tocarNotificacao).toHaveBeenCalledTimes(1);
    expect(tocarAlertaUrgente).not.toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FILA_ATIVA_QUERY_KEY });
  });

  it("toca alerta urgente em loop ao receber INSERT urgente", async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>
    );

    await waitFor(() => expect(insertHandler).toBeTypeOf("function"));

    insertHandler?.({
      new: {
        id: "u1",
        pacienteId: "p2",
        paciente: { id: "p2", name: "Joao" },
        tipoChamada: "urgente",
        status: "aguardando",
        criadoEm: new Date("2026-03-17T10:05:00.000Z"),
        finalizadoEm: null,
      },
    });

    expect(tocarAlertaUrgente).toHaveBeenCalledTimes(1);
    expect(tocarNotificacao).not.toHaveBeenCalled();
  });

  it("remove da fila e para alerta quando urgente finaliza", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.setQueryData(FILA_ATIVA_QUERY_KEY, [
      {
        id: "u1",
        pacienteId: "p2",
        paciente: { id: "p2", name: "Joao" },
        tipoChamada: "urgente",
        status: "aguardando",
        criadoEm: new Date("2026-03-17T10:05:00.000Z"),
        finalizadoEm: null,
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>
    );

    await waitFor(() => expect(updateHandler).toBeTypeOf("function"));

    updateHandler?.({
      new: {
        id: "u1",
        pacienteId: "p2",
        paciente: { id: "p2", name: "Joao" },
        tipoChamada: "urgente",
        status: "finalizado",
        criadoEm: new Date("2026-03-17T10:05:00.000Z"),
        finalizadoEm: new Date("2026-03-17T10:12:00.000Z"),
      },
    });

    const fila = queryClient.getQueryData<unknown[]>(FILA_ATIVA_QUERY_KEY) ?? [];

    expect(fila).toHaveLength(0);
    expect(pararAlertaUrgente).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ATENDIMENTOS_DIA_QUERY_KEY });
  });
});
