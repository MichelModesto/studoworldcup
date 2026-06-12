import { ImageResponse } from "next/og";
import { getGrupoPorCodigo, normalizarCodigo } from "@/lib/bolao";
import { temBanco } from "@/lib/db";

export const alt = "Convite para o bolão da Copa 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGConvite({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const cod = normalizarCodigo(codigo);
  let nome = "Bolão da Copa 2026";
  let membros = 0;
  if (temBanco()) {
    try {
      const g = await getGrupoPorCodigo(cod);
      if (g) {
        nome = g.nome;
        membros = g.membros;
      }
    } catch {
      /* genérico */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d12",
          color: "#edede6",
          fontFamily: "sans-serif",
          padding: 70,
        }}
      >
        <div style={{ fontSize: 30, color: "#8c92a3", letterSpacing: 6, textTransform: "uppercase" }}>
          ⚽ Você foi convidado!
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: -2,
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          {nome}
        </div>
        <div style={{ marginTop: 14, fontSize: 30, color: "#8c92a3" }}>
          {`${membros > 0 ? `${membros} participante${membros > 1 ? "s" : ""} já dentro · ` : ""}Bolão da Copa 2026`}
        </div>
        <div
          style={{
            marginTop: 50,
            display: "flex",
            alignItems: "center",
            gap: 20,
            border: "3px solid #ffb300",
            borderRadius: 20,
            padding: "22px 44px",
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: 16,
            color: "#ffb300",
          }}
        >
          {cod}
        </div>
        <div style={{ marginTop: 40, fontSize: 26, color: "#8c92a3" }}>
          Crie sua conta grátis e entre com o código · studoworldcup.vercel.app
        </div>
      </div>
    ),
    size,
  );
}
