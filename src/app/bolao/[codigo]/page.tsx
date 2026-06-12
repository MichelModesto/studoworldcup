import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Dices, Users } from "lucide-react";
import { Logo } from "@/components/brand";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import { entrarNoGrupo, getGrupoPorCodigo, normalizarCodigo } from "@/lib/bolao";

/**
 * Link de convite compartilhável: /bolao/K7M2QX
 * - Logado: entra no grupo e cai no ranking.
 * - Deslogado: página PÚBLICA de convite (com OG bonita pro WhatsApp)
 *   levando ao cadastro com retorno automático para cá.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const cod = normalizarCodigo(codigo);
  let nome = "Bolão da Copa 2026";
  if (temBanco()) {
    const g = await getGrupoPorCodigo(cod).catch(() => null);
    if (g) nome = g.nome;
  }
  return {
    title: `Convite: ${nome} · StudoWorldCup`,
    description: `Entre no bolão "${nome}" com o código ${cod} e dispute o ranking de palpites da Copa 2026.`,
  };
}

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const cod = normalizarCodigo(codigo);
  if (!temBanco()) redirect("/painel/bolao");

  const sessao = await getSession();
  if (sessao && sessao.uid > 0) {
    const r = await entrarNoGrupo(sessao.uid, cod);
    if ("erro" in r) redirect("/painel/bolao");
    redirect(`/painel/bolao/grupo/${r.codigo}`);
  }

  const grupo = await getGrupoPorCodigo(cod).catch(() => null);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="glass neon-border p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">⚽ Você foi convidado</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
            {grupo?.nome ?? "Bolão da Copa 2026"}
          </h1>
          {grupo && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted">
              <Users className="h-4 w-4" /> {grupo.membros} participante
              {grupo.membros === 1 ? "" : "s"} já na disputa
            </p>
          )}

          <p className="mx-auto mt-5 max-w-sm text-sm text-muted">
            Palpite nos jogos da Copa 2026 e dispute o ranking: placar exato vale{" "}
            <strong className="text-gold">3 pts</strong>, acertar o vencedor vale{" "}
            <strong className="text-brand">1 pt</strong>.
          </p>

          <p className="mt-6 select-all rounded-xl border border-brand/40 bg-surface/60 px-4 py-3 font-mono text-2xl font-bold tracking-[0.35em] text-brand">
            {cod}
          </p>

          <Link
            href={`/login?next=/bolao/${cod}`}
            className="btn-brand mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base"
          >
            <Dices className="h-5 w-5" /> Criar conta e entrar no bolão
          </Link>
          <p className="mt-3 text-xs text-muted">
            Já tem conta?{" "}
            <Link href={`/login?next=/bolao/${cod}`} className="text-brand hover:underline">
              Entrar <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
