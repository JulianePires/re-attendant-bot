import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Gera um bundle standalone otimizado para containers (Docker/Nixpacks).
  // Cria .next/standalone/ com apenas os arquivos necessários para rodar
  // a aplicação, sem precisar copiar node_modules completo.
  output: "standalone",
};

export default nextConfig;
