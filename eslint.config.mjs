import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Desativa regras do ESLint que conflitam com o Prettier.
  // Deve ser o último item para sobrescrever qualquer regra anterior.
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "vitest.config.ts"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
