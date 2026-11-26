"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import {
  FALA_BOAS_VINDAS,
  FALA_PEDIR_TELEFONE,
  FALA_REGISTRANDO,
  MENSAGEM_ERRO_TECNICO,
  MENSAGEM_PROFISSIONAL_CHAMADO,
  falaConfirmacao,
  montarMensagemConfirmacao,
} from "@/lib/crm/mensagens";
import { formatarTelefone, validarTelefone } from "@/lib/crm/telefone";
import {
  confirmarChegadaCheckin,
  localizarAgendamentoCheckin,
  type RespostaLocalizarAgendamento,
} from "@/server/actions/checkin-crm";
import { EntradaNomeFila } from "./EntradaNomeFila";
import { TecladoNumerico } from "./TecladoNumerico";

type Etapa =
  | "IDLE"
  | "HOME"
  | "TELEFONE"
  | "BUSCANDO"
  | "CONFIRMAR"
  | "REGISTRANDO"
  | "NEGOCIO"
  | "CHEGADA_REGISTRADA"
  | "FALAR_PROFISSIONAL"
  | "PROFISSIONAL_CHAMADO"
  | "INDISPONIVEL";

type Agendamento = Extract<RespostaLocalizarAgendamento, { tipo: "encontrado" }>["agendamento"];

// Respostas que mostram a tela de resultado: as demais têm tela própria.
// `nao_encontrada` vem da confirmação (UC-002 E2) e, como o impedimento, só oferece voltar.
type ResultadoNegocio = {
  tipo:
    | Exclude<
        RespostaLocalizarAgendamento["tipo"],
        "encontrado" | "telefone_invalido" | "chegada_ja_registrada" | "indisponivel"
      >
    | "nao_encontrada";
  mensagem: string;
};

// Volta ao início sozinho (RF-001.12, RF-001.13). Etapas fora da lista não têm
// tempo: a tela inicial e a busca em andamento.
const TEMPO_PARA_VOLTAR_MS: Partial<Record<Etapa, number>> = {
  HOME: 30_000,
  TELEFONE: 30_000,
  CONFIRMAR: 30_000,
  FALAR_PROFISSIONAL: 30_000,
  NEGOCIO: 20_000,
  INDISPONIVEL: 15_000,
  CHEGADA_REGISTRADA: 10_000,
  PROFISSIONAL_CHAMADO: 10_000,
};

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

// Mesmo papel do botão de urgência do /recepcao; red-600 garante contraste AA com texto branco.
const BOTAO_PROFISSIONAL =
  "flex min-h-16 w-full cursor-pointer items-center justify-center rounded-xl border border-red-700 bg-red-600 px-6 text-xl font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-red-300 focus-visible:outline-none";

// Os dois botões da tela inicial têm o mesmo tamanho; a cor diz qual é qual.
// red-600 e emerald-700 garantem contraste AA com texto branco.
const BOTAO_INICIAL =
  "flex min-h-20 w-72 shrink-0 cursor-pointer items-center justify-center rounded-2xl border px-6 py-5 text-center text-xl font-semibold text-white transition-all active:scale-95 focus-visible:ring-4 focus-visible:outline-none";

const CARTAO =
  "relative mx-auto flex w-full max-w-xl flex-col gap-5 rounded-3xl border border-sky-800/60 bg-sky-950/85 p-6 backdrop-blur-sm";

/** Totem de teste: localizar o agendamento pelo telefone (UC-001, spec S1-01). */
export function KioskCheckinFlow({ handleToggleTalking }: KioskCheckinFlowProps) {
  const [etapa, setEtapa] = useState<Etapa>("IDLE");
  const [digitos, setDigitos] = useState("");
  const [erroTelefone, setErroTelefone] = useState<string | null>(null);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [mensagemIndisponivel, setMensagemIndisponivel] = useState("");
  const [resultadoNegocio, setResultadoNegocio] = useState<ResultadoNegocio | null>(null);
  const [mensagemChegada, setMensagemChegada] = useState("");
  // Comprovante opaco do agendamento localizado (ADR 0003); o tablet só o devolve.
  const [comprovante, setComprovante] = useState<string | null>(null);
  // Cada toque reinicia a contagem de inatividade.
  const [toques, setToques] = useState(0);
  // O estado só muda na próxima renderização; o ref bloqueia o segundo toque já no mesmo ciclo (E11).
  const buscandoRef = useRef(false);
  const confirmandoRef = useRef(false);

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
    setResultadoNegocio(null);
    setMensagemChegada("");
    setComprovante(null);
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

  // O telefone digitado antes não serve para a chamada: é descartado (RNF-001.5).
  function irParaFalarComProfissional() {
    descartarDados();
    setEtapa("FALAR_PROFISSIONAL");
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
    setComprovante(null);
    setEtapa("BUSCANDO");
    try {
      const resposta = await localizarAgendamentoCheckin(validacao.digitos);
      if (resposta.tipo === "encontrado") {
        setAgendamento(resposta.agendamento);
        setComprovante(resposta.comprovante);
        setEtapa("CONFIRMAR");
      } else if (resposta.tipo === "telefone_invalido") {
        setErroTelefone(resposta.mensagem);
        setEtapa("TELEFONE");
      } else if (resposta.tipo === "chegada_ja_registrada") {
        // ja_registrado é sucesso: não chama a confirmação (RF-001.9).
        setMensagemChegada(resposta.mensagem);
        setEtapa("CHEGADA_REGISTRADA");
      } else if (resposta.tipo !== "indisponivel") {
        setResultadoNegocio({ tipo: resposta.tipo, mensagem: resposta.mensagem });
        setEtapa("NEGOCIO");
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

  async function confirmarChegada() {
    if (confirmandoRef.current || !comprovante) return;

    confirmandoRef.current = true;
    setEtapa("REGISTRANDO");
    try {
      const resposta = await confirmarChegadaCheckin(comprovante);
      if (resposta.tipo === "chegada_registrada") {
        setMensagemChegada(resposta.mensagem);
        setEtapa("CHEGADA_REGISTRADA");
      } else if (resposta.tipo === "nao_encontrada" || resposta.tipo === "impedimento") {
        setResultadoNegocio({ tipo: resposta.tipo, mensagem: resposta.mensagem });
        setEtapa("NEGOCIO");
      } else {
        setMensagemIndisponivel(resposta.mensagem);
        setEtapa("INDISPONIVEL");
      }
    } catch {
      setMensagemIndisponivel(MENSAGEM_ERRO_TECNICO);
      setEtapa("INDISPONIVEL");
    } finally {
      confirmandoRef.current = false;
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
      case "REGISTRANDO":
        falarComRosto(FALA_REGISTRANDO);
        break;
      case "INDISPONIVEL":
        falarComRosto(mensagemIndisponivel);
        break;
      case "NEGOCIO":
        if (resultadoNegocio) falarComRosto(resultadoNegocio.mensagem);
        break;
      case "CHEGADA_REGISTRADA":
        falarComRosto(mensagemChegada);
        break;
      case "PROFISSIONAL_CHAMADO":
        falarComRosto(MENSAGEM_PROFISSIONAL_CHAMADO);
        break;
    }
    // Fala só ao entrar na etapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa]);

  useEffect(() => {
    const tempo = TEMPO_PARA_VOLTAR_MS[etapa];
    if (tempo === undefined) return;

    const temporizador = setTimeout(voltarAoInicio, tempo);
    return () => clearTimeout(temporizador);
    // A contagem recomeça a cada etapa nova ou toque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, toques]);

  const transicao = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3, ease: "easeOut" as const },
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex h-full w-full flex-col text-zinc-100 select-none"
      onClickCapture={() => setToques((n) => n + 1)}
      onInputCapture={() => setToques((n) => n + 1)}
    >
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
            className="pointer-events-auto mt-auto flex w-full justify-between gap-4 px-6 pb-10"
          >
            <button type="button" onClick={voltarAoInicio} className={BOTAO_VOLTAR}>
              <ArrowLeft className="h-6 w-6" aria-hidden="true" /> Voltar ao início
            </button>
            {/* Mesmo lugar do botão de urgência do /recepcao (RF-001.18). */}
            <button
              type="button"
              onClick={irParaFalarComProfissional}
              className={`${BOTAO_INICIAL} border-red-700 bg-red-600 hover:bg-red-700 focus-visible:ring-red-300`}
            >
              Falar com um profissional
            </button>
            <button
              type="button"
              onClick={irParaTelefone}
              className={`${BOTAO_INICIAL} border-emerald-800 bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-300`}
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
              <button type="button" onClick={confirmarChegada} className={BOTAO_PRIMARIO}>
                Confirmar chegada
              </button>
              <button type="button" onClick={irParaTelefone} className={BOTAO_SECUNDARIO}>
                Não sou eu
              </button>
            </section>
          </motion.div>
        )}

        {etapa === "REGISTRANDO" && (
          <motion.div
            key="registrando"
            {...transicao}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-4"
          >
            <div className={CARTAO} aria-live="polite" aria-busy="true">
              <p className="flex items-center justify-center gap-3 text-2xl font-semibold text-white">
                <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                Registrando sua chegada...
              </p>
            </div>
          </motion.div>
        )}

        {etapa === "NEGOCIO" && resultadoNegocio && (
          <motion.div
            key="negocio"
            {...transicao}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-4"
          >
            <section
              className={CARTAO}
              aria-label={
                resultadoNegocio.tipo === "nao_encontrada" || comprovante
                  ? "Resultado da confirmação"
                  : "Resultado da busca"
              }
            >
              {/* O texto vem do CRM sem alteração; o motivo bruto não chega aqui (RF-001.8). */}
              <p
                role="alert"
                className="text-center text-2xl leading-snug font-semibold text-white"
              >
                {resultadoNegocio.mensagem}
              </p>
              {(resultadoNegocio.tipo === "nao_encontrado" ||
                resultadoNegocio.tipo === "sem_agendamento") && (
                <button type="button" onClick={irParaTelefone} className={BOTAO_SECUNDARIO}>
                  Tentar outro telefone
                </button>
              )}
              {(resultadoNegocio.tipo === "nao_encontrado" ||
                resultadoNegocio.tipo === "sem_agendamento") && (
                <button
                  type="button"
                  onClick={irParaFalarComProfissional}
                  className={BOTAO_PROFISSIONAL}
                >
                  Falar com um profissional
                </button>
              )}
              <button type="button" onClick={voltarAoInicio} className={BOTAO_PRIMARIO}>
                Voltar ao início
              </button>
            </section>
          </motion.div>
        )}

        {etapa === "FALAR_PROFISSIONAL" && (
          <motion.div
            key="falar-profissional"
            {...transicao}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-4"
          >
            <button type="button" onClick={voltarAoInicio} className={BOTAO_VOLTAR}>
              <ArrowLeft className="h-6 w-6" aria-hidden="true" /> Voltar ao início
            </button>
            <EntradaNomeFila
              classeCartao={CARTAO}
              classeBotao={BOTAO_PRIMARIO}
              onConcluido={() => setEtapa("PROFISSIONAL_CHAMADO")}
              onErro={() => {
                setMensagemIndisponivel(MENSAGEM_ERRO_TECNICO);
                setEtapa("INDISPONIVEL");
              }}
            />
          </motion.div>
        )}

        {(etapa === "CHEGADA_REGISTRADA" || etapa === "PROFISSIONAL_CHAMADO") && (
          <motion.div
            key="sucesso"
            {...transicao}
            className="pointer-events-auto flex h-full w-full flex-col items-center justify-center px-4"
          >
            <section
              className={CARTAO}
              aria-label={
                etapa === "PROFISSIONAL_CHAMADO" ? "Profissional chamado" : "Chegada registrada"
              }
            >
              <p
                role="status"
                className="text-center text-3xl leading-snug font-semibold text-emerald-300"
              >
                {etapa === "PROFISSIONAL_CHAMADO" ? MENSAGEM_PROFISSIONAL_CHAMADO : mensagemChegada}
              </p>
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
