import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, temBanco } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Registra (POST) ou remove (DELETE) a inscrição de push do usuário logado. */
export async function POST(req: Request) {
  if (!temBanco()) return NextResponse.json({ erro: "sem banco" }, { status: 503 });
  const sessao = await getSession();
  if (!sessao || sessao.uid <= 0) return NextResponse.json({ erro: "não logado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  const p256dh = body?.keys?.p256dh as string | undefined;
  const auth = body?.keys?.auth as string | undefined;
  if (!endpoint?.startsWith("https://") || !p256dh || !auth) {
    return NextResponse.json({ erro: "inscrição inválida" }, { status: 400 });
  }

  await sql()`
    INSERT INTO push_subscriptions (endpoint, usuario_id, p256dh, auth)
    VALUES (${endpoint}, ${sessao.uid}, ${p256dh}, ${auth})
    ON CONFLICT (endpoint)
    DO UPDATE SET usuario_id = ${sessao.uid}, p256dh = ${p256dh}, auth = ${auth}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!temBanco()) return NextResponse.json({ erro: "sem banco" }, { status: 503 });
  const sessao = await getSession();
  if (!sessao || sessao.uid <= 0) return NextResponse.json({ erro: "não logado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  if (endpoint) {
    await sql()`
      DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND usuario_id = ${sessao.uid}
    `;
  }
  return NextResponse.json({ ok: true });
}
