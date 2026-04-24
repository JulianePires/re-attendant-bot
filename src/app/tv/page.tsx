"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Maximize2, Minimize2, Volume2 } from "lucide-react";
import { obterFilaPublica } from "@/server/actions/atendimento";
import { FILA_PUBLICA_QUERY_KEY, useRealtimeQueuePublic } from "@/hooks/useRealtimeQueuePublic";

type Atendimento = {
  id: string;
  nomePaciente: string;
  tipoChamada: string;
  status: string;
  criadoEm: Date;
  finalizadoEm: Date | null;
};

/** Retorna string formatada de tempo de espera (ex.: "5 min" ou "1 h 2 min") */
function tempoEspera(criadoEm: Date): string {
  const diffMs = Date.now() - new Date(criadoEm).getTime();
  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin < 1) return "< 1 min";
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Tela pública para TV da sala de espera — READ-ONLY
 * Exibe fila de atendimento em tempo real com:
 * - Última chamada em destaque
 * - Próximos da fila (Urgente + Normal) em cards compactos
 * - Atualização automática via Supabase Realtime (INSERT/UPDATE/DELETE)
 * - Alertas sonoros em INSERT
 * - Botão Fullscreen no canto superior direito
 */
export default function TVPage() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [ultimaChamada, setUltimaChamada] = useState<Atendimento | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, forceRerender] = useState(0);

  const normalAudioRef = useRef<HTMLAudioElement | null>(null);
  const urgenteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Atualiza tempo de espera a cada minuto
  useEffect(() => {
    const interval = setInterval(() => forceRerender((n) => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Detectar mudança de fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Query para carregar fila inicial
  const { data: fila = [] } = useQuery<Atendimento[]>({
    queryKey: FILA_PUBLICA_QUERY_KEY,
    queryFn: obterFilaPublica,
    staleTime: 0,
    refetchInterval: 30000, // fallback a cada 30s
  });

  // Callback estável para não re-montar canal a cada render
  const handleNewPatient = useCallback(
    (payload: {
      id: string;
      nomePaciente: string;
      tipoChamada: string;
      status?: string;
      criadoEm: string;
      finalizadoEm?: string | null;
    }) => {
      const isUrgent = payload.tipoChamada?.toLowerCase() === "urgente";
      const audio = isUrgent ? urgenteAudioRef.current : normalAudioRef.current;

      if (audio && audioUnlocked) {
        audio.currentTime = 0;
        audio.play().catch((e) => console.warn("Erro ao tocar áudio:", e));
      }

      setUltimaChamada({
        id: payload.id,
        nomePaciente: payload.nomePaciente,
        tipoChamada: payload.tipoChamada || "normal",
        status: payload.status || "aguardando",
        criadoEm: new Date(payload.criadoEm),
        finalizadoEm: payload.finalizadoEm ? new Date(payload.finalizadoEm) : null,
      });
    },
    [audioUnlocked]
  );

  // Realtime com callback estável
  useRealtimeQueuePublic({ onNewPatient: handleNewPatient });

  // Inicializar áudio
  useEffect(() => {
    normalAudioRef.current = new Audio("/sounds/notificacao.mp3");
    urgenteAudioRef.current = new Audio("/sounds/alerta.mp3");
    if (normalAudioRef.current) {
      normalAudioRef.current.preload = "auto";
      normalAudioRef.current.volume = 0.8;
    }
    if (urgenteAudioRef.current) {
      urgenteAudioRef.current.preload = "auto";
      urgenteAudioRef.current.volume = 1;
    }
  }, []);

  // Desbloquear áudio no primeiro clique
  const handleUnlockAudio = async () => {
    if (audioUnlocked) return;
    try {
      const promises: Promise<void>[] = [];
      if (normalAudioRef.current) {
        normalAudioRef.current.volume = 0;
        promises.push(
          normalAudioRef.current.play().then(() => {
            normalAudioRef.current!.pause();
            normalAudioRef.current!.currentTime = 0;
            normalAudioRef.current!.volume = 0.8;
          })
        );
      }
      if (urgenteAudioRef.current) {
        urgenteAudioRef.current.volume = 0;
        promises.push(
          urgenteAudioRef.current.play().then(() => {
            urgenteAudioRef.current!.pause();
            urgenteAudioRef.current!.currentTime = 0;
            urgenteAudioRef.current!.volume = 1;
          })
        );
      }
      await Promise.all(promises);
      setAudioUnlocked(true);
    } catch (error) {
      console.warn("Erro ao desbloquear áudio:", error);
    }
  };

  // Fullscreen toggle
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Separar fila por tipo
  const filaUrgente = fila.filter((a) => a.tipoChamada.toLowerCase() === "urgente");
  const filaNormal = fila.filter((a) => a.tipoChamada.toLowerCase() === "normal");
  const proximaChamada = fila[0] || null;

  return (
    <>
      {/* Overlay de desbloqueio de áudio */}
      {!audioUnlocked && (
        <div
          onClick={handleUnlockAudio}
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-slate-950/95 backdrop-blur-sm"
        >
          <div className="text-center">
            <Volume2 className="mx-auto mb-6 h-24 w-24 animate-pulse text-violet-400" />
            <h1 className="mb-4 text-4xl font-bold text-white">Monitor da Sala de Espera</h1>
            <p className="text-xl text-slate-300">Clique em qualquer lugar para iniciar</p>
          </div>
        </div>
      )}

      {/* Tela principal — READ-ONLY */}
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-4xl font-bold text-violet-400">Fila de Atendimento</h1>
            <p className="mt-1 text-lg text-slate-400">Acompanhe sua vez em tempo real</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5">
              <Bell className="h-5 w-5 text-violet-400" />
              <span className="text-2xl font-bold text-white">{fila.length}</span>
              <span className="text-base text-slate-400">na fila</span>
            </div>
            {/* Botão Fullscreen — canto superior direito do header */}
            <button
              onClick={handleFullscreen}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              <span className="text-sm font-medium">{isFullscreen ? "Sair" : "Tela Cheia"}</span>
            </button>
          </div>
        </header>

        {/* Layout dividido */}
        <div className="grid grid-cols-2 gap-8">
          {/* Lado Esquerdo: Chamando Agora + Próximo */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl bg-linear-to-br from-violet-600 to-violet-800 p-10 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-white" />
                <h2 className="text-2xl font-bold tracking-wider uppercase">Chamando Agora</h2>
              </div>

              {ultimaChamada ? (
                <div className="text-center">
                  <p className="mb-3 text-7xl leading-tight font-black tracking-tight text-white uppercase drop-shadow-2xl">
                    {ultimaChamada.nomePaciente}
                  </p>
                  <div
                    className={`mx-auto inline-block rounded-full px-6 py-2 text-xl font-bold ${
                      ultimaChamada.tipoChamada.toLowerCase() === "urgente"
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white"
                    }`}
                  >
                    {ultimaChamada.tipoChamada.toUpperCase()}
                  </div>
                </div>
              ) : (
                <p className="text-center text-3xl text-violet-200">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>

            {proximaChamada && (
              <div className="rounded-2xl bg-slate-800 px-8 py-5 shadow-xl">
                <h3 className="mb-2 text-lg font-bold text-slate-300">Próximo:</h3>
                <div className="flex items-baseline gap-4">
                  <p className="text-5xl font-black text-white uppercase">
                    {proximaChamada.nomePaciente}
                  </p>
                  <span className="text-base font-medium text-slate-400">
                    {tempoEspera(proximaChamada.criadoEm)} de espera
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Lado Direito: Próximos da Fila (compacto) */}
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-slate-300">Próximos da Fila</h2>

            {/* Fila Urgente */}
            {filaUrgente.length > 0 && (
              <div className="rounded-xl bg-red-950/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-400">
                  <Bell className="h-5 w-5" />
                  Urgente ({filaUrgente.length})
                </h3>
                <div className="space-y-1.5">
                  {filaUrgente.slice(0, 7).map((atendimento, index) => (
                    <div
                      key={atendimento.id}
                      className="flex items-center gap-3 rounded-lg bg-red-900/30 px-4 py-2"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-bold">
                        {index + 1}
                      </div>
                      <p className="text-xl font-bold tracking-wide text-white uppercase">
                        {atendimento.nomePaciente}
                      </p>
                      <span className="ml-auto text-sm font-medium whitespace-nowrap text-red-300">
                        {tempoEspera(atendimento.criadoEm)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fila Normal */}
            {filaNormal.length > 0 && (
              <div className="rounded-xl bg-slate-800 p-4">
                <h3 className="mb-3 text-lg font-bold text-slate-300">
                  Normal ({filaNormal.length})
                </h3>
                <div className="space-y-1.5">
                  {filaNormal.slice(0, 10).map((atendimento, index) => (
                    <div
                      key={atendimento.id}
                      className="flex items-center gap-3 rounded-lg bg-slate-700/50 px-4 py-2"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold">
                        {index + 1}
                      </div>
                      <p className="text-xl font-bold tracking-wide text-white uppercase">
                        {atendimento.nomePaciente}
                      </p>
                      <span className="ml-auto text-sm font-medium whitespace-nowrap text-slate-400">
                        {tempoEspera(atendimento.criadoEm)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fila.length === 0 && (
              <div className="rounded-xl bg-slate-800 p-10 text-center">
                <p className="text-2xl text-slate-400">Nenhum paciente na fila</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
