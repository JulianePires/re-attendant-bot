"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import {
  FALA_BOAS_VINDAS,
  FALA_PEDIR_TELEFONE,
  MENSAGEM_ERRO_TECNICO,
  falaConfirmacao,
  montarMensagemConfirmacao,
} from "@/lib/crm/mensagens";
import { formatarTelefone, validarTelefone } from "@/lib/crm/telefone";
import {
  localizarAgendamentoCheckin,
  type RespostaLocalizarAgendamento,
} from "@/server/actions/checkin-crm";
import { TecladoNumerico } from "./TecladoNumerico";

type Etapa = "IDLE" | "HOME" | "TELEFONE" | "BUSCANDO" | "CONFIRMAR" | "INDISPONIVEL";

type Agendamento = Extract<RespostaLocalizarAgendamento, { tipo: "encontrado" }>["agendamento"];

type KioskCheckinFlowProps = {
  handleToggleTalking?: (falando: boolean) => void;
};

// DDD + número (11); com o "55" do país na frente, até 13.
function maximoDigitos(digitos: string): number {
  return digitos.startsWith("55") ? 13 : 11;
}

const BOTAO_VOLTAR =
  "pointer-events-auto absolute top-8 left-8 z-50 flex min-h-16 items-center gap-2 rounded-2xl px-5 py-3 text-lg font-medium text-zinc-100 shadow-lg transition-all hover:bg-zinc-800/80 active:scale-95 focus-visible:ring-4 focus-visible:ring-emerald-400 focus-visible:outline-none";

const BOTAO_PRIMARIO =
  "flex min-h-16 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 text-xl font-bold text-white transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:outline-none";

const BOTAO_SECUNDARIO =
  "flex min-h-16 w-full cursor-pointer items-center justify-center rounded-xl border border-sky-700 bg-sky-900/80 px-6 text-xl font-semibold text-white transition-all active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-emerald-400 focus-visible:outline-none";

const CARTAO =
  "relative mx-auto flex w-full max-w-xl flex-col gap-5 rounded-3xl border border-sky-800/60 bg-sky-950/85 p-6 backdrop-blur-sm";

/** Totem de teste: localizar o agendamento pelo telefone (UC-001, spec S1-01). */
export function KioskCheckinFlow({ handleToggleTalking }: KioskCheckinFlowProps) {
  const [etapa, setEtapa] = useState<Etapa>("IDLE");
  const [digitos, setDigitos] = useState("");
  const [erroTelefone, setErroTelefone] = useState<string | null>(null);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [mensagemIndisponivel, setMensagemIndisponivel] = useState("");
  // O estado só muda na próxima renderização; o ref bloqueia o segundo toque já no mesmo ciclo (E11).
  const buscandoRef = useRef(false);

  const { falar, parar } = useTTS();

  function falarComRosto(texto: string) {
    falar(
      texto,
      () => handleToggleTalking?.(true),
      () => handleToggleTalking?.(false)
    );
  }

  function descartarDados() {
    setDigitos("");
    setErroTelefone(null);
    setAgendamento(null);
    setMensagemIndisponivel("");
  }

  function voltarAoInicio() {
    descartarDados();
    parar();
    handleToggleTalking?.(false);
    setEtapa("IDLE");
  }

  function irParaTelefone() {
    descartarDados();
    setEtapa("TELEFONE");
  }

  function adicionarDigito(digito: string) {
    setErroTelefone(null);
    setDigitos((atual) => (atual.length >= maximoDigitos(atual) ? atual : atual + digito));
  }

  async function buscar() {
    if (buscandoRef.current) return;

    const validacao = validarTelefone(digitos);
    if (!validacao.valido) {
      setErroTelefone(validacao.mensagem);
      return;
    }

    buscandoRef.current = true;
    setEtapa("BUSCANDO");
    try {
      const resposta = await localizarAgendamentoCheckin(validacao.digitos);
      if (resposta.tipo === "encontrado") {
        setAgendamento(resposta.agendamento);
        setEtapa("CONFIRMAR");
      } else if (resposta.tipo === "telefone_invalido") {
        setErroTelefone(resposta.mensagem);
        setEtapa("TELEFONE");
      } else {
        setMensagemIndisponivel(resposta.mensagem);
        setEtapa("INDISPONIVEL");
      }
    } catch {
      // A chamada da action pode falhar no transporte (rede, novo deploy):
      // o paciente não pode ficar preso na tela de busca.
      setMensagemIndisponivel(MENSAGEM_ERRO_TECNICO);
      setEtapa("INDISPONIVEL");
    } finally {
      buscandoRef.current = false;
    }
  }

  useEffect(() => {
    switch (etapa) {
      case "HOME":
        falarComRosto(FALA_BOAS_VINDAS);
        break;
      case "TELEFONE":
        falarComRosto(FALA_PEDIR_TELEFONE);
        break;
      case "CONFIRMAR":
        if (agendamento) falarComRosto(falaConfirmacao(agendamento.primeiroNome));
        break;
      case "INDISPONIVEL":
        falarComRosto(mensagemIndisponivel);
        break;
    }
    // Fala só ao entrar na etapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa]);

  const transicao = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3, ease: "easeOut" as const },
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex h-full w-full flex-col text-zinc-100 select-none">
      <AnimatePresence mode="wait">
        {etapa === "IDLE" && (
          <motion.div
            key="idle"
            {...transicao}
            className="pointer-events-auto mt-auto flex w-full justify-end px-8 pb-12"
          >
            <button
              type="button"
              onClick={() => setEtapa("HOME")}
              className="flex min-h-16 cursor-pointer items-center gap-3 rounded-full border border-emerald-800 bg-emerald-600 px-10 text-lg font-bold text-emerald-100 transition-all hover:bg-emerald-600/50 focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:outline-none active:scale-95"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              Toque para iniciar
            </button>
          </motion.div>
        )}

        {etapa === "HOME" && (
          <motion.div
            key="home"
            {...transicao}
            className="pointer-events-auto mt-auto flex w-full justify-end px-6 pb-10"
          >
            <button type="button" onClick={voltarAoInicio} className={BOTAO_VOLTAR}>
              <ArrowLeft className="h-6 w-6" aria-hidden="true" /> Voltar ao início
            </button>
            <button
              type="button"
              onClick={irParaTelefone}
              className="flex min-h-20 w-72 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-500 bg-emerald-500 px-6 py-5 text-xl font-semibold text-white transition-all hover:bg-emerald-500/80 focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:outline-none active:scale-95"
            >
              Tenho consulta agendada
            </button>
          </motion.div>
        )}

        {etapa === "TELEFONE" && (
          <motion.div
            key="telefone"
            {...transicao}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-4"
          >
            <button type="button" onClick={voltarAoInicio} className={BOTAO_VOLTAR}>
              <ArrowLeft className="h-6 w-6" aria-hidden="true" /> Voltar ao início
            </button>

            <section className={CARTAO} aria-labelledby="titulo-telefone">
              <h2 id="titulo-telefone" className="text-center text-3xl font-bold text-white">
                Informe seu telefone
              </h2>
              <p className="text-center text-lg text-sky-200">Com DDD, só números.</p>

              {/* Campo só de exibição: o telefone vem do teclado na tela. Não usar <output>,
                  que tem papel implícito "status" e se confunde com a mensagem de confirmação. */}
              <div
                role="textbox"
                aria-readonly="true"
                aria-label="Telefone"
                className="block min-h-20 rounded-xl border border-sky-800 bg-sky-950 px-5 py-5 text-center text-4xl font-semibold tracking-wide text-white"
              >
                {formatarTelefone(digitos)}
              </div>

              {erroTelefone && (
                <p role="alert" className="text-center text-xl font-semibold text-amber-300">
                  {erroTelefone}
                </p>
              )}

              <TecladoNumerico
                onDigito={adicionarDigito}
                onApagar={() => {
                  setErroTelefone(null);
                  setDigitos((atual) => atual.slice(0, -1));
                }}
                onLimpar={() => {
                  setErroTelefone(null);
                  setDigitos("");
                }}
              />

              <button type="button" onClick={buscar} className={BOTAO_PRIMARIO}>
                Buscar
              </button>
            </section>
          </motion.div>
        )}

        {etapa === "BUSCANDO" && (
          <motion.div
            key="buscando"
            {...transicao}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-4"
          >
            <div className={CARTAO} aria-live="polite" aria-busy="true">
              <p className="flex items-center justify-center gap-3 text-2xl font-semibold text-white">
                <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                Procurando seu agendamento...
              </p>
            </div>
          </motion.div>
        )}

        {etapa === "CONFIRMAR" && agendamento && (
          <motion.div
            key="confirmar"
            {...transicao}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-4"
          >
            <button type="button" onClick={voltarAoInicio} className={BOTAO_VOLTAR}>
              <ArrowLeft className="h-6 w-6" aria-hidden="true" /> Voltar ao início
            </button>

            <section className={CARTAO} aria-label="Confirmação do agendamento">
              <p
                role="status"
                className="text-center text-3xl leading-snug font-semibold text-white"
              >
                {montarMensagemConfirmacao(agendamento)}
              </p>
              {/* A confirmação de chegada é do UC-002 (outra spec). */}
              <button type="button" className={BOTAO_PRIMARIO}>
                Confirmar chegada
              </button>
              <button type="button" onClick={irParaTelefone} className={BOTAO_SECUNDARIO}>
                Não sou eu
              </button>
            </section>
          </motion.div>
        )}

        {etapa === "INDISPONIVEL" && (
          <motion.div
            key="indisponivel"
            {...transicao}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-4"
          >
            <section className={CARTAO} aria-label="Check-in indisponível">
              <p
                role="alert"
                className="text-center text-2xl leading-snug font-semibold text-white"
              >
                {mensagemIndisponivel}
              </p>
              <button type="button" onClick={voltarAoInicio} className={BOTAO_PRIMARIO}>
                Voltar ao início
              </button>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
