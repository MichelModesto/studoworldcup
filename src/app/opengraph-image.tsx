import { ImageResponse } from "next/og";
import { getMatches } from "@/lib/worldcup";

export const alt = "StudoWorldCup — Copa 2026 + Bolão";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// "S" dot-matrix da marca (grade 3×5)
const PONTOS: [number, number][] = [
  [0, 0], [1, 0], [2, 0],
  [0, 1],
  [0, 2], [1, 2], [2, 2],
  [2, 3],
  [0, 4], [1, 4], [2, 4],
];

function MarcaOG({ escala = 1 }: { escala?: number }) {
  const passo = 26 * escala;
  const raio = 9 * escala;
  return (
    <div style={{ display: "flex", position: "relative", width: passo * 3, height: passo * 5 }}>
      {PONTOS.map(([c, r]) => (
        <div
          key={`${c}-${r}`}
          style={{
            position: "absolute",
            left: c * passo,
            top: r * passo,
            width: raio * 2,
            height: raio * 2,
            borderRadius: 999,
            background: "#ffb300",
          }}
        />
      ))}
    </div>
  );
}

export default async function OG() {
  let linhaJogo = "104 jogos · 48 seleções · 3 países";
  try {
    const matches = await getMatches();
    const agora = Date.now();
    const proximo = matches
      .filter((m) => m.kickoffISO && Date.parse(m.kickoffISO) > agora)
      .sort((a, b) => a.kickoffISO!.localeCompare(b.kickoffISO!))[0];
    if (proximo) {
      const hora = new Date(proximo.kickoffISO!).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
      linhaJogo = `Próximo jogo: ${proximo.mandante} × ${proximo.visitante} · ${hora}`;
    }
  } catch {
    /* mantém o fallback */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0b0d12",
          color: "#edede6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <MarcaOG escala={1.1} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
              <span>STUDO</span>
              <span style={{ color: "#ffb300" }}>WORLDCUP</span>
            </div>
            <div style={{ fontSize: 30, color: "#8c92a3", marginTop: 6 }}>
              Copa 2026 em tempo real + bolão com os amigos
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 70,
            display: "flex",
            alignItems: "center",
            gap: 16,
            border: "2px solid rgba(255,179,0,0.4)",
            borderRadius: 24,
            padding: "26px 36px",
            fontSize: 34,
            color: "#ffb300",
          }}
        >
          {linhaJogo}
        </div>

        <div style={{ marginTop: 40, fontSize: 24, color: "#8c92a3" }}>
          Placar exato vale 3 pts · acertou o vencedor, 1 pt · studoworldcup.vercel.app
        </div>
      </div>
    ),
    size,
  );
}
