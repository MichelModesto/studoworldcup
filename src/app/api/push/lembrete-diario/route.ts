import { NextResponse } from "next/server";
import webpush from "web-push";
import { sql, temBanco } from "@/lib/db";
import { getMatches } from "@/lib/worldcup";

export const dynamic = "force-dynamic";

/**
 * Cron diário (Vercel, 12:00 UTC = 9h de Brasília): avisa por push quem
 * tem jogos HOJE ainda sem palpite. Protegido pelo CRON_SECRET.
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET?.trim();
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!temBanco()) return NextResponse.json({ erro: "sem banco" }, { status: 503 });

  // tolera espaços/aspas acidentais ao colar no painel da Vercel
  const limpar = (v?: string) => v?.trim().replace(/^["']|["']$/g, "") ?? "";
  const publicKey = limpar(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const privateKey = limpar(process.env.VAPID_PRIVATE_KEY);
  if (!publicKey || !privateKey) {
    return NextResponse.json({ erro: "VAPID não configurado" }, { status: 503 });
  }
  try {
    webpush.setVapidDetails("mailto:dev@flexaseal.com.br", publicKey, privateKey);
  } catch (e) {
    return NextResponse.json(
      { erro: `chaves VAPID inválidas: ${e instanceof Error ? e.message : "?"}` },
      { status: 503 },
    );
  }

  // jogos de hoje (fuso de Brasília) que ainda não começaram
  const matches = await getMatches();
  const diaSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const hoje = diaSP.format(new Date());
  const agora = Date.now();
  const jogosHoje = matches.filter(
    (m) =>
      m.kickoffISO &&
      diaSP.format(new Date(m.kickoffISO)) === hoje &&
      Date.parse(m.kickoffISO) > agora,
  );
  if (!jogosHoje.length) return NextResponse.json({ ok: true, enviados: 0, motivo: "sem jogos" });
  const idsHoje = jogosHoje.map((m) => m.id);

  const subs = (await sql()`
    SELECT s.endpoint, s.p256dh, s.auth, s.usuario_id, u.nome
    FROM push_subscriptions s JOIN usuarios u ON u.id = s.usuario_id
  `) as { endpoint: string; p256dh: string; auth: string; usuario_id: number; nome: string }[];
  if (!subs.length) return NextResponse.json({ ok: true, enviados: 0, motivo: "sem inscritos" });

  // palpites já feitos para os jogos de hoje, por usuário
  const feitos = (await sql()`
    SELECT usuario_id, match_id FROM palpites WHERE match_id = ANY(${idsHoje})
  `) as { usuario_id: number; match_id: number }[];
  const feitosPorUsuario = new Map<number, Set<number>>();
  for (const f of feitos) {
    (feitosPorUsuario.get(f.usuario_id) ?? feitosPorUsuario.set(f.usuario_id, new Set()).get(f.usuario_id)!).add(
      f.match_id,
    );
  }

  let enviados = 0;
  for (const s of subs) {
    const ja = feitosPorUsuario.get(s.usuario_id) ?? new Set();
    const faltam = jogosHoje.filter((m) => !ja.has(m.id));
    if (!faltam.length) continue;
    const primeiro = faltam[0];
    const corpo =
      faltam.length === 1
        ? `${primeiro.mandante} × ${primeiro.visitante} é hoje e você ainda não palpitou!`
        : `${faltam.length} jogos hoje sem palpite — o primeiro é ${primeiro.mandante} × ${primeiro.visitante}.`;
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ titulo: "⚽ Bolão da Copa: palpite hoje!", corpo, url: "/painel/bolao/palpites" }),
      );
      enviados++;
    } catch (e) {
      // inscrição morta (app desinstalado etc.) -> limpa
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await sql()`DELETE FROM push_subscriptions WHERE endpoint = ${s.endpoint}`;
      }
    }
  }
  return NextResponse.json({ ok: true, enviados, jogosHoje: jogosHoje.length });
}
