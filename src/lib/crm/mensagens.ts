/**
 * Textos do totem de check-in integrado. Seguro para o navegador.
 * Os textos de erro de negócio vêm do CRM; os daqui são do próprio totem (RN-001.4).
 */

export const MENSAGEM_TELEFONE_INVALIDO = "Digite o telefone com DDD.";

export const MENSAGEM_ERRO_TECNICO =
  "Não foi possível concluir seu check-in agora. Por favor, procure a recepção.";

export const MENSAGEM_CHAVE_INVALIDA = "Chave de acesso inválida.";

// Textos padrão quando o CRM não manda `mensagem` (RF-001.23, RF-001.25).
// Provisórios até a cliente aprovar (REQ-001 Q-13).
export const TEXTO_PADRAO_POR_CATEGORIA = {
  telefone_invalido: MENSAGEM_TELEFONE_INVALIDO,
  nao_encontrado: "Não encontrei nenhum cadastro com esse número.",
  fora_da_janela:
    "Sua consulta de hoje ainda não está no horário de check-in. Por favor, procure a recepção.",
  sem_agendamento: "Não encontrei agendamento para agora.",
  ja_registrado: "Sua chegada já estava registrada. Aguarde, você será chamado(a) em breve.",
  desconhecido: "Não foi possível continuar seu check-in. Por favor, procure a recepção.",
} as const;

// Quem não tem agendamento fala com um profissional: chamada urgente (RF-001.18).
export const MENSAGEM_PROFISSIONAL_CHAMADO =
  "Tudo certo! Aguarde que logo um profissional chegará.";

export function montarNotificacaoSemAgendamento(nome: string): string {
  return `Sem agendamento: ${nome} quer falar com um profissional`;
}

export const FALA_PEDIR_TELEFONE = "Digite seu telefone com DDD e toque em buscar.";

export const FALA_BOAS_VINDAS =
  "Olá! Bem-vindo. Meu nome é Rê! Toque em tenho consulta agendada para avisar sua chegada.";

type DadosConfirmacao = {
  primeiroNome: string;
  hora: string;
  profissional: string;
};

/** Usa o campo `profissional`, nunca o nome citado na `mensagem` do CRM (RN-001.9). */
export function montarMensagemConfirmacao({
  primeiroNome,
  hora,
  profissional,
}: DadosConfirmacao): string {
  return `${primeiroNome}, seu agendamento é às ${hora} com ${profissional}. Confirme para registrar sua chegada.`;
}

/** A voz fala só o primeiro nome: nada de hora, profissional, telefone ou procedimento (RF-001.21). */
export function falaConfirmacao(primeiroNome: string): string {
  return `${primeiroNome}, encontrei seu agendamento. Confira os dados na tela e confirme sua chegada.`;
}
