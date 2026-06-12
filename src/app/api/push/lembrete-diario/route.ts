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

  // jogos de hoje (fuso de Brasília) que ainda não começaram + encerrados de ontem
  const matches = await getMatches();
  const diaSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const hoje = diaSP.format(new Date());
  const ontem = diaSP.format(new Date(Date.now() - 24 * 3600_000));
  const agora = Date.now();
  const jogosHoje = matches.filter(
    (m) =>
      m.kickoffISO &&
      diaSP.format(new Date(m.kickoffISO)) === hoje &&
      Date.parse(m.kickoffISO) > agora,
  );
  const jogosOntem = matches.filter(
    (m) =>
      m.status === "encerrado" && m.kickoffISO && diaSP.format(new Date(m.kickoffISO)) === ontem,
  );
  if (!jogosHoje.length && !jogosOntem.length) {
    return NextResponse.json({ ok: true, enviados: 0, motivo: "sem jogos" });
  }
  const idsHoje = jogosHoje.map((m) => m.id);

  const subs = (await sql()`
    SELECT s.endpoint, s.p256dh, s.auth, s.usuario_id, u.nome
    FROM push_subscriptions s JOIN usuarios u ON u.id = s.usuario_id
  `) as { endpoint: string; p256dh: string; auth: string; usuario_id: number; nome: string }[];
  if (!subs.length) return NextResponse.json({ ok: true, enviados: 0, motivo: "sem inscritos" });

  // palpites de hoje (lembrete) e de ontem (resumo de pontos), por usuário
  const idsOntem = jogosOntem.map((m) => m.id);
  const todosIds = [...idsHoje, ...idsOntem];
  const feitos = todosIds.length
    ? ((await sql()`
        SELECT usuario_id, match_id, gols_mandante, gols_visitante
        FROM palpites WHERE match_id = ANY(${todosIds})
      `) as { usuario_id: number; match_id: number; gols_mandante: number; gols_visitante: number }[])
    : [];
  const feitosPorUsuario = new Map<number, Set<number>>();
  const pontosOntem = new Map<number, { pts: number; exatos: number }>();
  const ontemById = new Map(jogosOntem.map((m) => [m.id, m]));
  for (const f of feitos) {
    (feitosPorUsuario.get(f.usuario_id) ?? feitosPorUsuario.set(f.usuario_id, new Set()).get(f.usuario_id)!).add(
      f.match_id,
    );
    const m = ontemById.get(f.match_id);
    if (m && m.placarMandante !== undefined && m.placarVisitante !== undefined) {
      const exato = f.gols_mandante === m.placarMandante && f.gols_visitante === m.placarVisitante;
      const acertou =
        Math.sign(f.gols_mandante - f.gols_visitante) ===
        Math.sign(m.placarMandante - m.placarVisitante);
      const pts = exato ? 3 : acertou ? 1 : 0;
      const acc = pontosOntem.get(f.usuario_id) ?? { pts: 0, exatos: 0 };
      acc.pts += pts;
      if (exato) acc.exatos++;
      pontosOntem.set(f.usuario_id, acc);
    }
  }

  let enviados = 0;
  for (const s of subs) {
    const ja = feitosPorUsuario.get(s.usuario_id) ?? new Set();
    const faltam = jogosHoje.filter((m) => !ja.has(m.id));
    const resumo = pontosOntem.get(s.usuario_id);
    if (!faltam.length && !resumo) continue;
    const partes: string[] = [];
    if (resumo) {
      partes.push(
        `Ontem você fez ${resumo.pts} pt${resumo.pts === 1 ? "" : "s"}${resumo.exatos ? ` (${resumo.exatos} exato${resumo.exatos > 1 ? "s" : ""}! 🎯)` : ""}.`,
      );
    }
    if (faltam.length) {
      const primeiro = faltam[0];
      partes.push(
        faltam.length === 1
          ? `${primeiro.mandante} × ${primeiro.visitante} é hoje e você ainda não palpitou!`
          : `${faltam.length} jogos hoje sem palpite — o primeiro é ${primeiro.mandante} × ${primeiro.visitante}.`,
      );
    }
    const corpo = partes.join(" ");
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
