import { createClient } from "@supabase/supabase-js";

// ================================================================
// CLIENTE SUPABASE — FOCADO EM REALTIME
//
// Este cliente é instanciado no BROWSER (variáveis NEXT_PUBLIC_*).
// Ele não é usado para queries ao banco — o Prisma cuida disso no
// servidor. O papel exclusivo deste cliente é assinar canais de
// Realtime para receber atualizações da fila em tempo real via
// WebSocket (protocolo Phoenix Channels do Supabase).
//
// Pré-requisito no Supabase: habilitar Realtime na tabela `atendimento`
// em Database > Replication > Tables.
// ================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      // Limite de eventos por segundo para evitar flooding no cliente.
      // 10 é suficiente para uma fila de clínica com baixo volume.
      eventsPerSecond: 10,
    },
  },
  // Desabilita o auto-refresh do token de auth do Supabase, pois a
  // autenticação da aplicação é gerenciada pelo BetterAuth.
  // Usamos apenas a anon key para acessar canais públicos do Realtime.
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ================================================================
// HELPER: NOME DO CANAL DA FILA
// Centraliza o nome do canal para evitar typos nos hooks.
// ================================================================
export const CANAL_FILA = "public:Atendimento";
