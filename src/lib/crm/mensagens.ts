/**
 * Textos do totem de check-in integrado. Seguro para o navegador.
 * Os textos de erro de negócio vêm do CRM; os daqui são do próprio totem (RN-001.4).
 */

export const MENSAGEM_TELEFONE_INVALIDO = "Digite o telefone com DDD.";

export const MENSAGEM_ERRO_TECNICO =
  "Não foi possível concluir seu check-in agora. Por favor, procure a recepção.";

export const MENSAGEM_CHAVE_INVALIDA = "Chave de acesso inválida.";

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
