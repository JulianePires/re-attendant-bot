import { Clock, CheckCircle2, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ================================================================
// Tipos e dados mockados
// Substituir pelo hook useRealtimeQueue (React Query + Supabase
// Realtime) no próximo passo de desenvolvimento.
// ================================================================

type TipoChamada = "normal" | "urgente";
type StatusAtendimento = "aguardando" | "finalizado";

interface ItemFila {
  id: string;
  nome: string;
  tipoChamada: TipoChamada;
  criadoEm: string;
  posicao: number;
}

interface Atendimento {
  id: string;
  nome: string;
  tipoChamada: TipoChamada;
  status: StatusAtendimento;
  finalizadoEm: string;
}

const FILA_MOCK: ItemFila[] = [
  { id: "1", posicao: 1, nome: "Maria Souza", tipoChamada: "urgente", criadoEm: "14:22" },
  { id: "2", posicao: 2, nome: "João Silva", tipoChamada: "normal", criadoEm: "14:30" },
  { id: "3", posicao: 3, nome: "Carlos Pereira", tipoChamada: "normal", criadoEm: "14:38" },
  { id: "4", posicao: 4, nome: "Fernanda Lima", tipoChamada: "normal", criadoEm: "14:45" },
];

const HISTORICO_MOCK: Atendimento[] = [
  {
    id: "h1",
    nome: "Ana Costa",
    tipoChamada: "normal",
    status: "finalizado",
    finalizadoEm: "14:18",
  },
  {
    id: "h2",
    nome: "Roberto Dias",
    tipoChamada: "urgente",
    status: "finalizado",
    finalizadoEm: "13:55",
  },
  {
    id: "h3",
    nome: "Luísa Ferreira",
    tipoChamada: "normal",
    status: "finalizado",
    finalizadoEm: "13:40",
  },
  {
    id: "h4",
    nome: "Pedro Alves",
    tipoChamada: "normal",
    status: "finalizado",
    finalizadoEm: "13:20",
  },
];

// ================================================================
// Subcomponentes
// ================================================================

function BadgeTipo({ tipo }: { tipo: TipoChamada }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tipo === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
      )}
    >
      {tipo === "urgente" && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
      {tipo === "urgente" ? "Urgente" : "Normal"}
    </span>
  );
}

function CartaoFila({ item }: { item: ItemFila }) {
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        item.tipoChamada === "urgente" && "border-red-200 bg-red-50/50"
      )}
    >
      {/* Posição na fila */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          item.tipoChamada === "urgente" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
        )}
        aria-label={`Posição ${item.posicao} na fila`}
      >
        {item.posicao}
      </div>

      {/* Dados do paciente */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-slate-800">{item.nome}</p>
        <div className="flex items-center gap-2">
          <BadgeTipo tipo={item.tipoChamada} />
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {item.criadoEm}
          </span>
        </div>
      </div>

      {/* Ação — será ligada ao Server Action de chamada */}
      <button
        className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        aria-label={`Chamar ${item.nome}`}
      >
        Chamar
      </button>
    </li>
  );
}

function CartaoHistorico({ atendimento }: { atendimento: Atendimento }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-white p-3.5 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-slate-700">{atendimento.nome}</p>
        <div className="flex items-center gap-2">
          <BadgeTipo tipo={atendimento.tipoChamada} />
          <span className="text-xs text-slate-400">{atendimento.finalizadoEm}</span>
        </div>
      </div>
    </li>
  );
}

// ================================================================
// Dashboard principal
// ================================================================

export default function PainelDashboardPage() {
  const totalHoje = HISTORICO_MOCK.length;
  const urgentesHoje = HISTORICO_MOCK.filter((a) => a.tipoChamada === "urgente").length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie a fila e acompanhe os atendimentos do dia
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Na fila</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{FILA_MOCK.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Atendidos hoje
          </p>
          <p className="mt-1 text-3xl font-bold text-green-600">{totalHoje}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Urgências hoje
          </p>
          <p className="mt-1 text-3xl font-bold text-red-500">{urgentesHoje}</p>
        </div>
      </div>

      {/* Corpo: duas colunas — Fila de espera | Histórico do dia */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Fila de Espera ── */}
        <section aria-labelledby="titulo-fila">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="titulo-fila"
              className="flex items-center gap-2 text-base font-semibold text-slate-800"
            >
              <User className="h-4 w-4 text-blue-500" aria-hidden="true" />
              Fila de Espera
              {/* Badge com contagem — ficará reativo ao Realtime */}
              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                {FILA_MOCK.length}
              </span>
            </h2>
            <span className="text-xs text-slate-400">
              {/* TODO: "Atualizado há X seg" via useRealtimeQueue */}
              Dados mock
            </span>
          </div>

          {FILA_MOCK.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-slate-400">
              <CheckCircle2 className="mb-2 h-8 w-8 text-green-400" />
              <p className="text-sm">Fila vazia — nenhum paciente aguardando</p>
            </div>
          ) : (
            <ul className="space-y-2.5" aria-label="Pacientes aguardando atendimento">
              {FILA_MOCK.map((item) => (
                <CartaoFila key={item.id} item={item} />
              ))}
            </ul>
          )}
        </section>

        {/* ── Atendimentos do Dia ── */}
        <section aria-labelledby="titulo-historico">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="titulo-historico"
              className="flex items-center gap-2 text-base font-semibold text-slate-800"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
              Atendimentos do Dia
              <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                {totalHoje}
              </span>
            </h2>
          </div>

          {HISTORICO_MOCK.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-slate-400">
              <Clock className="mb-2 h-8 w-8" />
              <p className="text-sm">Nenhum atendimento finalizado ainda</p>
            </div>
          ) : (
            <ul className="space-y-2.5" aria-label="Atendimentos finalizados hoje">
              {HISTORICO_MOCK.map((atendimento) => (
                <CartaoHistorico key={atendimento.id} atendimento={atendimento} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
