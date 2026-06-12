import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudoWorldCup — Copa 2026 + Bolão",
    short_name: "StudoWorldCup",
    description:
      "Estatísticas em tempo real da Copa do Mundo 2026 e bolão com seus amigos.",
    start_url: "/painel",
    display: "standalone",
    background_color: "#0a0f1e",
    theme_color: "#0a0f1e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
