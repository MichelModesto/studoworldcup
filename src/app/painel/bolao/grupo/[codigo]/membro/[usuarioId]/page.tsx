import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Crown, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TagAoVivo } from "@/components/painel/placar-fx";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import {
  detalhePalpite,
  ehMembro,
  emProrrogacao,
  formaDoGrupo,
  getGrupoPorCodigo,
  jaComecou,
  palpitesDoUsuario,
  placarValido,
  rankingDoGrupo,
} from "@/lib/bolao";
import { Forma } from "@/components/painel/forma-bolao";
import { getMatches } from "@/lib/worldcup";

export const metadata = { title: "Palpites do participante" };

const FUSO = "America/Sao_Paulo";

const badgePontos: Record<number, { txt: string; cls: string }> = {
  3: { txt: "+3 exato! 🎯", cls: "bg-gold/15 text-gold" },
  1: { txt: "+1 resultado", cls: "bg-brand/15 text-brand" },
  0: { txt: "0 pts", cls: "bg-surface-2 text-muted" },
};

/**
 * Palpites de UM participante do grupo — visíveis para os colegas
 * apenas nos jogos que JÁ COMEÇARAM (depois do apito ninguém troca).
 */
export default async function MembroPage({
  params,
}: {
  params: Promise<{ codigo: string; usuarioId: string }>;
}) {
  const { codigo, usuarioId } = await params;
  if (!temBanco()) redirect("/painel/bolao");
  const sessao = await getSession();
  if (!sessao || sessao.uid <= 0) redirect("/login?next=/painel/bolao");

  const grupo = await getGrupoPorCodigo(codigo);
  if (!grupo) notFound();
  if (!(await ehMembro(grupo.id, sessao.uid))) redirect("/painel/bolao");

  const alvoId = Number(usuarioId);
  const [ranking, forma, matches] = await Promise.all([
    rankingDoGrupo(grupo.id),
    formaDoGrupo(grupo.id).catch(() => new Map()),
    getMatches(),
  ]);
  const posicao = ranking.findIndex((l) => l.usuarioId === alvoId);
  const linha = posicao >= 0 ? ranking[posicao] : null;
  if (!linha) notFound(); // só membros do grupo são visíveis

  const palpites = await palpitesDoUsuario(alvoId);
  const iniciados = matches
    .filter((m) => jaComecou(m))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const futurosPalpitados = [...palpites.keys()].filter((id) =>
    matches.some((m) => m.id === id && !jaComecou(m)),
  ).length;
  const souEu = alvoId === sessao.uid;

  return (
    <>
      <Link
        href={`/painel/bolao/grupo/${grupo.codigo}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {grupo.nome}
      </Link>

      {/* Cabeçalho do participante */}
      <div className="glass neon-border mb-7 flex flex-wrap items-center gap-5 p-6">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/15 font-display text-xl font-bold text-brand">
          {linha.nome
            .split(/\s+/)
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
        <div className="flex-1">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold tracking-tight">
            {linha.nome}
            <Forma jogos={forma.get(alvoId) ?? []} tamanho="md" />
            {alvoId === grupo.donoId && <Crown className="h-5 w-5 text-gold" />}
            {souEu && (
              <span className="rounded-full bg-brand/15 px-2 py-px text-xs font-medium text-brand">
                você
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {posicao + 1}º no {grupo.nome} · {linha.exatos} exato{linha.exatos === 1 ? "" : "s"} ·{" "}
            {linha.resultados} resultado{linha.resultados === 1 ? "" : "s"}
            {linha.vencedores > 0 && ` · ${linha.vencedores} vencedor${linha.vencedores === 1 ? "" : "es"} 🏆`}{" "}
            · {linha.palpites} palpite{linha.palpites === 1 ? "" : "s"}
          </p>
        </div>
        <p className="text-right">
          <span className="block font-mono text-4xl font-bold tabular-nums text-brand">
            {linha.pontos}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted">pontos</span>
        </p>
      </div>

      {futurosPalpitados > 0 && !souEu && (
        <p className="mb-5 flex items-center gap-2 text-xs text-muted">
          <EyeOff className="h-3.5 w-3.5" /> {linha.nome} já palpitou em {futurosPalpitados} jogo
          {futurosPalpitados > 1 ? "s" : ""} que ainda não começou — esses ficam secretos até a
          bola rolar. 🤫
        </p>
      )}

      <Card titulo={`Palpites nos jogos já iniciados (${iniciados.length})`}>
        {iniciados.length === 0 ? (
          <p className="text-sm text-muted">A Copa ainda nem começou — volta no apito inicial!</p>
        ) : (
          <div className="space-y-2">
            {iniciados.map((m) => {
              const p = palpites.get(m.id);
              const d = p && m.status !== "agendado" ? detalhePalpite(p, m) : null;
              const badge = d ? badgePontos[d.base] : null;
              const prorrogacao = emProrrogacao(m);
              const placar90 = placarValido(m);
              return (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border/40 pb-2.5 text-sm last:border-0 last:pb-0"
                >
                  <span className="hidden w-24 shrink-0 text-xs text-muted sm:block">
                    {m.kickoffISO &&
                      new Date(m.kickoffISO).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        timeZone: FUSO,
                      })}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span className="truncate text-right font-medium">{m.mandante}</span>
                    <span className="text-xl">{m.flagMandante}</span>
                  </span>
                  <span className="shrink-0 font-mono text-base font-bold tabular-nums">
                    {m.placarMandante ?? "–"} × {m.placarVisitante ?? "–"}
                    {prorrogacao && placar90 && (
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        (90&apos;: {placar90.mandante}×{placar90.visitante})
                      </span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-xl">{m.flagVisitante}</span>
                    <span className="truncate font-medium">{m.visitante}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {p ? (
                      <>
                        palpite:{" "}
                        <strong className="text-foreground">
                          {p.golsMandante}×{p.golsVisitante}
                        </strong>
                      </>
                    ) : (
                      "não palpitou"
                    )}
                  </span>
                  {badge && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
                    >
                      {badge.txt}
                    </span>
                  )}
                  {d && d.bonus > 0 && (
                    <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
                      {d.bonusProvisorio ? "+1 provisório 🏆" : "+1 vencedor 🏆"}
                    </span>
                  )}
                  {d && m.status === "ao-vivo" && (
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-brand">
                      +{d.total} ao vivo
                    </span>
                  )}
                  {m.status === "ao-vivo" && (
                    <TagAoVivo texto={prorrogacao ? "prorrogação" : "ao vivo"} />
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs text-muted/70">
          Palpites de jogos futuros ficam ocultos para todo mundo até o início de cada partida —
          assim ninguém cola de ninguém.
        </p>
      </Card>
    </>
  );
}
