/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Tipos permitidos para commits deste projeto
    "type-enum": [
      2,
      "always",
      [
        "feat", // Nova funcionalidade
        "fix", // Correção de bug
        "docs", // Documentação
        "style", // Formatação (sem lógica)
        "refactor", // Refatoração sem nova feature/fix
        "test", // Testes
        "chore", // Tarefas de manutenção (build, deps)
        "ci", // Configuração de CI/CD
        "perf", // Melhoria de performance
        "revert", // Reversão de commit
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", 100],
  },
};
