"use client";

// ================================================================
// Tela de Standby — "/" (raiz do totem)
//
// Esta é a tela principal do kiosk. Exibida em loop quando nenhum
// paciente está interagindo. Dois princípios guiam o design:
//
// 1. ACESSIBILIDADE EXTREMA: botões gigantes, contraste alto e
//    aria-labels descritivos para usuários com baixa acuidade visual.
//
// 2. AFFORDANCE CLARA: o paciente nunca deve ter dúvida sobre o que
//    tocar. Por isso há apenas duas ações possíveis na tela inicial.
//
// O layout kiosk (gradiente, sem scroll, select-none) é aplicado
// inline aqui — o route group (tablet) cuidará das sub-páginas
// futuras (/fila, /sucesso, etc.).
// ================================================================

import { BotAvatar } from "@/components/tablet/BotAvatar";
import { useTTS } from "@/hooks/useTTS";
import { AlertCircle, LogIn } from "lucide-react";

export default function TabletStandbyPage() {
  const { falar } = useTTS();

  function handleEntrarFila() {
    falar("Você entrou na fila de atendimento. Por favor, aguarde ser chamado.");
    // TODO: chamar Server Action → criar Atendimento com tipoChamada = 'normal'
  }

  function handleUrgente() {
    falar("Sua solicitação urgente foi registrada. Nossa equipe virá até você em instantes.");
    // TODO: chamar Server Action → criar Atendimento com tipoChamada = 'urgente'
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 select-none">
      {/* Manchas de cor difusas — criam sensação de ambiente iluminado e acolhedor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-sky-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-indigo-200/50 blur-3xl"
      />

      <main className="relative z-10 flex w-full max-w-md flex-col items-center gap-10 px-6 py-12">
        {/* Avatar + boas-vindas */}
        <div className="flex flex-col items-center gap-5">
          <BotAvatar tamanho="lg" />

          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-800">Olá! 👋</h1>
            <p className="mt-2 text-xl text-slate-500">Bem-vindo à clínica. Como posso ajudar?</p>
          </div>
        </div>

        {/* Botões de ação — grandes para acessibilidade em tela touch */}
        <div className="flex w-full flex-col gap-4" role="group" aria-label="Opções de atendimento">
          {/* Ação 1: fluxo normal — azul primário */}
          <button
            onClick={handleEntrarFila}
            aria-label="Entrar na fila de atendimento normal"
            className="flex w-full items-center justify-center gap-4 rounded-2xl bg-blue-600 px-8 py-7 text-2xl font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
          >
            <LogIn className="h-8 w-8 shrink-0" aria-hidden="true" />
            Entrar na Fila
          </button>

          {/* Ação 2: urgência — vermelho sinaliza prioridade sem ser alarmante */}
          <button
            onClick={handleUrgente}
            aria-label="Registrar chamada urgente — para casos de dor ou mal-estar"
            className="flex w-full items-center justify-center gap-4 rounded-2xl bg-red-500 px-8 py-7 text-2xl font-semibold text-white shadow-lg shadow-red-200/60 transition-all hover:bg-red-600 focus-visible:ring-4 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
          >
            <AlertCircle className="h-8 w-8 shrink-0" aria-hidden="true" />
            Preciso de Urgência
          </button>
        </div>

        {/* aria-live="polite" anuncia mudanças para leitores de tela */}
        <p className="text-sm text-slate-400" aria-live="polite">
          Toque em uma das opções para continuar
        </p>
      </main>
    </div>
  );
}
