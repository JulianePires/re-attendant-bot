// Fixtures de teste (não é código de produção).
// Formatos da especificação da cliente e da verificação na API real do CRM em 2026-11-26.

export const consultaIdLocalizada = "3f1c2b9a-6d4e-4f8a-9b7c-2e5d1a0f8c34";

export const respostaConfirmacaoSucesso = {
  status: 200,
  corpo: {
    ok: true,
    status: "realizada",
    mensagem:
      "Obrigado, Maria! Sua chegada foi registrada. Aguarde, você será chamado(a) em breve.",
  },
};

// Especificação: repetir a confirmação devolve ja_registrado (não observado na API).
export const respostaConfirmacaoJaRegistrado = {
  status: 200,
  corpo: { ok: false, motivo: "ja_registrado", mensagem: "Sua chegada já foi registrada." },
};

// Observado na API: consulta_id em formato UUID que não existe.
export const respostaConfirmacaoNaoEncontrada = {
  status: 200,
  corpo: { ok: false, motivo: "nao_encontrada", mensagem: "Não encontrei essa consulta." },
};

// Observado na API: consulta_id que não é UUID (motivo não documentado).
export const respostaConfirmacaoDadosInvalidos = {
  status: 200,
  corpo: {
    ok: false,
    motivo: "dados_invalidos",
    mensagem: "Faltou alguma informação para eu concluir.",
  },
};

// Observado na API: chave inválida.
export const respostaConfirmacaoTokenInvalido = {
  status: 401,
  corpo: {
    ok: false,
    motivo: "token_invalido",
    mensagem: "Não consegui acessar a agenda agora. Só um instante, por favor.",
  },
};
