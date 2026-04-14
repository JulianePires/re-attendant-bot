"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bell, Maximize2, Volume2 } from "lucide-react";
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

/**
 * Tela pública para TV da sala de espera
 * Exibe fila de atendimento em tempo real com:
 * - Última chamada em destaque
 * - Próximos da fila (Urgente + Normal)
 * - Atualização automática via Supabase Realtime
 * - Alertas sonoros
 */
export default function TVPage() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [ultimaChamada, setUltimaChamada] = useState<Atendimento | null>(null);

  const normalAudioRef = useRef<HTMLAudioElement | null>(null);
  const urgenteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Query para carregar fila inicial
  const { data: fila = [] } = useQuery<Atendimento[]>({
    queryKey: FILA_PUBLICA_QUERY_KEY,
    queryFn: obterFilaPublica,
    staleTime: 0,
    refetchInterval: 10000, // Refetch a cada 10s como fallback
  });

  // Realtime com callback para tocar som
  useRealtimeQueuePublic({
    onNewPatient: (payload) => {
      const isUrgent = payload.tipoChamada?.toLowerCase() === "urgente";
      const audio = isUrgent ? urgenteAudioRef.current : normalAudioRef.current;

      if (audio && audioUnlocked) {
        audio.currentTime = 0;
        audio.play().catch((e) => console.warn("Erro ao tocar áudio:", e));
      }

      // Atualiza última chamada
      setUltimaChamada({
        id: payload.id,
        nomePaciente: payload.nomePaciente,
        tipoChamada: payload.tipoChamada || "normal",
        status: payload.status || "aguardando",
        criadoEm: new Date(payload.criadoEm),
        finalizadoEm: payload.finalizadoEm ? new Date(payload.finalizadoEm) : null,
      });
    },
  });

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
      const promises = [];

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

  // Fullscreen
  const handleFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  // Separar fila por tipo
  const filaUrgente = fila.filter((a) => a.tipoChamada.toLowerCase() === "urgente");
  const filaNormal = fila.filter((a) => a.tipoChamada.toLowerCase() === "normal");

  // Primeira chamada (mais antiga)
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

      {/* Tela principal */}
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between border-b border-slate-700 pb-6">
          <div>
            <h1 className="text-5xl font-bold text-violet-400">Fila de Atendimento</h1>
            <p className="mt-2 text-xl text-slate-400">Acompanhe sua vez em tempo real</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-3">
              <Bell className="h-6 w-6 text-violet-400" />
              <span className="text-3xl font-bold text-white">{fila.length}</span>
              <span className="text-lg text-slate-400">na fila</span>
            </div>
          </div>
        </header>

        {/* Layout dividido */}
        <div className="grid grid-cols-2 gap-8">
          {/* Lado Esquerdo: Última/Próxima Chamada */}
          <div className="flex flex-col gap-8">
            {/* Chamando Agora */}
            <div className="rounded-2xl bg-linear-to-br from-violet-600 to-violet-800 p-12 shadow-2xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-4 w-4 animate-pulse rounded-full bg-white" />
                <h2 className="text-3xl font-bold tracking-wider uppercase">Chamando Agora</h2>
              </div>

              {ultimaChamada ? (
                <div className="text-center">
                  <p className="mb-4 text-8xl leading-tight font-black tracking-tight text-white drop-shadow-2xl">
                    {ultimaChamada.nomePaciente}
                  </p>
                  <div
                    className={`mx-auto inline-block rounded-full px-8 py-3 text-2xl font-bold ${
                      ultimaChamada.tipoChamada.toLowerCase() === "urgente"
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white"
                    }`}
                  >
                    {ultimaChamada.tipoChamada.toUpperCase()}
                  </div>
                </div>
              ) : (
                <p className="text-center text-4xl text-violet-200">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>

            {/* Próximo */}
            {proximaChamada && (
              <div className="rounded-2xl bg-slate-800 p-10 shadow-xl">
                <h3 className="mb-4 text-2xl font-bold text-slate-300">Próximo:</h3>
                <p className="text-6xl font-black text-white">{proximaChamada.nomePaciente}</p>
              </div>
            )}
          </div>

          {/* Lado Direito: Próximos da Fila */}
          <div className="flex flex-col gap-6">
            <h2 className="text-3xl font-bold text-slate-300">Próximos da Fila</h2>

            {/* Fila Urgente */}
            {filaUrgente.length > 0 && (
              <div className="rounded-xl bg-red-950/50 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-2xl font-bold text-red-400">
                  <Bell className="h-6 w-6" />
                  Urgente ({filaUrgente.length})
                </h3>
                <div className="space-y-3">
                  {filaUrgente.slice(0, 5).map((atendimento, index) => (
                    <div
                      key={atendimento.id}
                      className="flex items-center gap-4 rounded-lg bg-red-900/30 p-4"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-2xl font-bold">
                        {index + 1}
                      </div>
                      <p className="text-2xl font-semibold text-white">
                        {atendimento.nomePaciente}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fila Normal */}
            {filaNormal.length > 0 && (
              <div className="rounded-xl bg-slate-800 p-6">
                <h3 className="mb-4 text-2xl font-bold text-slate-300">
                  Normal ({filaNormal.length})
                </h3>
                <div className="space-y-3">
                  {filaNormal.slice(0, 8).map((atendimento, index) => (
                    <div
                      key={atendimento.id}
                      className="flex items-center gap-4 rounded-lg bg-slate-700/50 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-xl font-bold">
                        {index + 1}
                      </div>
                      <p className="text-xl font-medium text-white">{atendimento.nomePaciente}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fila.length === 0 && (
              <div className="rounded-xl bg-slate-800 p-12 text-center">
                <p className="text-3xl text-slate-400">Nenhum paciente na fila</p>
              </div>
            )}
          </div>
        </div>

        {/* Botão Fullscreen discreto */}
        <button
          onClick={handleFullscreen}
          className="fixed right-4 bottom-4 rounded-lg bg-slate-800/50 p-3 opacity-30 transition-opacity hover:opacity-100"
          aria-label="Tela cheia"
        >
          <Maximize2 className="h-5 w-5 text-slate-400" />
        </button>
      </div>
    </>
  );
}
