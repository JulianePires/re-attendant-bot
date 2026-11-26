"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { APP_ROUTES } from "@/lib/constants";
import { MENSAGEM_ERRO_TECNICO } from "@/lib/crm/mensagens";
import { ativarTotemCheckin } from "@/server/actions/checkin-crm";

/**
 * Ativação do tablet no totem de teste (RNF-001.4). A chave vai no corpo da
 * Server Action, nunca na URL, e não fica no histórico nem nos logs (RNF-001.1).
 */
export default function AtivacaoTotemForm() {
  const router = useRouter();
  const [chave, setChave] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  async function ativar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoRef.current || !chave) return;

    enviandoRef.current = true;
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await ativarTotemCheckin(chave);
      if (resultado.ok) {
        router.replace(APP_ROUTES.TOTEM_CRM);
        return;
      }
      setErro(resultado.mensagem);
    } catch {
      setErro(MENSAGEM_ERRO_TECNICO);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-zinc-100">
      <form
        aria-label="Ativar totem"
        onSubmit={ativar}
        className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-8"
      >
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <KeyRound className="h-6 w-6" aria-hidden="true" />
          Ativar este tablet
        </h1>

        <label className="flex flex-col gap-2 text-lg font-medium">
          Chave de acesso
          <input
            type="password"
            autoComplete="off"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            className="min-h-16 rounded-xl border border-slate-700 bg-slate-950 px-4 text-xl text-white focus-visible:ring-4 focus-visible:ring-emerald-400 focus-visible:outline-none"
          />
        </label>

        {erro && (
          <p role="alert" className="text-lg font-semibold text-amber-300">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-xl bg-emerald-600 text-xl font-bold text-white transition-all hover:bg-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:outline-none disabled:opacity-50"
        >
          {enviando && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          Ativar
        </button>
      </form>
    </main>
  );
}
