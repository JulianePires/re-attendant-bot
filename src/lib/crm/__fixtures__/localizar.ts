// Fixtures de teste (não é código de produção).
// Formatos vindos da especificação e da verificação na API real do CRM em 2026-11-26.

export const respostaSucesso = {
  status: 200,
  corpo: {
    ok: true,
    consulta_id: "3f1c2b9a-6d4e-4f8a-9b7c-2e5d1a0f8c34",
    nome: "Maria Souza",
    primeiro_nome: "Maria",
    hora: "14:00",
    profissional: "Ana Lima",
    procedimento: "Pilates Clínico",
    // Cita outro profissional de propósito (RN-001.9): a tela usa o campo `profissional`.
    mensagem:
      "Maria, seu agendamento é às 14:00 com Dr. Cássio Santiago. Confirme para registrar sua chegada.",
  },
};

export const respostaTelefoneInvalido = {
  status: 200,
  corpo: {
    ok: false,
    motivo: "telefone_invalido",
    mensagem: "Digite o telefone com DDD.",
  },
};

export const respostaPacienteNaoEncontrado = {
  status: 200,
  corpo: {
    ok: false,
    motivo: "paciente_nao_encontrado",
    mensagem: "Não encontrei nenhum cadastro com esse número.",
  },
};

export const respostaTokenInvalido = {
  status: 401,
  corpo: {
    ok: false,
    motivo: "token_invalido",
    mensagem: "Não consegui acessar a agenda agora. Só um instante, por favor.",
  },
};
