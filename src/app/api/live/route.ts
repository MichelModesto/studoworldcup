import { NextResponse } from "next/server";
import { getLiveScoreboard } from "@/lib/worldcup/live";

/** Placar ao vivo para o polling do cliente (30s). Sempre fresco. */
export const dynamic = "force-dynamic";

export async function GET() {
  const jogos = await getLiveScoreboard();
  return NextResponse.json(jogos, {
    headers: { "cache-control": "no-store" },
  });
}
