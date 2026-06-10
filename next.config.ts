import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace neste projeto (há outros lockfiles na pasta pai).
  turbopack: {
    root: __dirname,
  },
  // As páginas leem data/*.json via fs em tempo de request; o tracing
  // automático não detecta leituras dinâmicas — inclui à mão no bundle.
  outputFileTracingIncludes: {
    "/**": ["./data/teams/**", "./data/squads/**", "./data/dossies/**"],
  },
};

export default nextConfig;
