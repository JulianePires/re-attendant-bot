"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { patientQueueSchema } from "@/lib/validations/schemas";
import { registrarEEntrarNaFila } from "@/server/actions/atendimento";

type EntradaNomeFilaProps = {
  classeCartao: string;
  classeBotao: string;
  onConcluido: () => void;
  onErro: () => void;
};

// Nome longo demais não cabe na TV nem no painel.
const TAMANHO_MAXIMO_NOME = 80;

/**
 * "Falar com um profissional" (RF-001.18): quem não tem agendamento informa o nome
 * e entra como chamada urgente, sem CRM, marcada como sem agendamento na
 * notificação da equipe. A fila normal é só para agendados (RF-001.19).
 */
export function EntradaNomeFila({
  classeCartao,
  classeBotao,
  onConcluido,
  onErro,
}: EntradaNomeFilaProps) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  // Se o totem voltou ao início durante o envio (inatividade ou "Voltar ao início"),
  // o retorno não pode aparecer para o próximo paciente.
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  async function entrarNaFila(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoRef.current) return;

    const validacao = patientQueueSchema.safeParse({ nome });
    if (!validacao.success) {
      setErro(validacao.error.issues[0].message);
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    try {
      await registrarEEntrarNaFila({
        nome: validacao.data.nome,
        tipoChamada: "urgente",
        semAgendamento: true,
      });
      if (montadoRef.current) onConcluido();
    } catch {
      if (montadoRef.current) onErro();
    } finally {
      enviandoRef.current = false;
      if (montadoRef.current) setEnviando(false);
    }
  }

  return (
    <form className={classeCartao} onSubmit={entrarNaFila} aria-label="Falar com um profissional">
      <label className="flex flex-col gap-2 text-2xl font-semibold text-white">
        Seu nome
        <input
          type="text"
          autoFocus
          autoComplete="off"
          maxLength={TAMANHO_MAXIMO_NOME}
          value={nome}
          onChange={(e) => {
            setErro(null);
            setNome(e.target.value);
          }}
          className="min-h-16 rounded-xl border border-sky-800 bg-sky-950 px-5 text-center text-3xl text-white focus-visible:ring-4 focus-visible:ring-emerald-400 focus-visible:outline-none"
        />
      </label>

      {erro && (
        <p role="alert" className="text-center text-xl font-semibold text-amber-300">
          {erro}
        </p>
      )}

      <button type="submit" disabled={enviando} className={classeBotao}>
        {enviando && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        Chamar um profissional
      </button>
    </form>
  );
}
