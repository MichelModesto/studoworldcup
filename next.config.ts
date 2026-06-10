import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace neste projeto (há outros lockfiles na pasta pai).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
