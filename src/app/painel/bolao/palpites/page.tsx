import Link from "next/link";
import { ArrowLeft, Database, Dices, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import { jaComecou, palpitesDoUsuario, pontosDoPalpite } from "@/lib/bolao";
import { getMatches } from "@/lib/worldcup";
import type { Match } from "@/lib/worldcup/types";
import { PalpitesForm, type JogoAberto } from "./palpites-form";

const FUSO = "America/Sao_Paulo";

function rotuloData(m: Match): string {
  const base = m.kickoffISO ?? `${m.dataISO}T12:00:00Z`;
  return new Date(base).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: FUSO,
  });
}

function hora(m: Match): string | null {
  if (!m.kickoffISO) return null;
  return new Date(m.kickoffISO).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
  });
}

const badgePontos: Record<number, { txt: string; cls: string }> = {
  3: { txt: "+3 placar exato!", cls: "bg-gold/15 text-gold" },
  1: { txt: "+1 resultado", cls: "bg-brand/15 text-brand" },
  0: { txt: "0 pts", cls: "bg-surface-2 text-muted" },
};

export default async function PalpitesPage() {
  const sessao = await getSession();

  const voltar = (
    <Link
      href="/painel/bolao"
      className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Bolão
    </Link>
  );

  if (!temBanco() || !sessao || sessao.uid <= 0) {
    return (
      <>
        {voltar}
        <EmptyState
          icon={!temBanco() ? Database : Dices}
          titulo={!temBanco() ? "Banco de dados não configurado" : "Crie sua conta para palpitar"}
          descricao={
            !temBanco()
              ? "Ligue o Postgres gratuito (Neon) seguindo o README para liberar os palpites."
              : "Acesse com a sua conta (ou crie uma grátis) na tela de entrada para registrar palpites."
          }
        />
      </>
    );
  }

  const [matches, meus] = await Promise.all([getMatches(), palpitesDoUsuario(sessao.uid)]);
  const ordenados = [...matches].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const abertos: JogoAberto[] = [];
  const fechados: Match[] = [];
  for (const m of ordenados) {
    if (jaComecou(m)) {
      fechados.push(m);
      continue;
    }
    const p = meus.get(m.id);
    abertos.push({
      id: m.id,
      rotuloData: rotuloData(m),
      hora: hora(m),
      fase: m.fase,
      grupo: m.grupo,
      mandante: m.mandante,
      flagMandante: m.flagMandante,
      visitante: m.visitante,
      flagVisitante: m.flagVisitante,
      gm: p ? String(p.golsMandante) : "",
      gv: p ? String(p.golsVisitante) : "",
    });
  }
  const palpitados = abertos.filter((j) => j.gm !== "").length;

  return (
    <>
      {voltar}
      <PageHeader
        titulo="Meus palpites"
        descricao={`Placar exato vale 3 pts; vencedor/empate certo vale 1 pt. Palpites travam no apito inicial (horários de Brasília). ${palpitados}/${abertos.length} jogos abertos palpitados.`}
      />

      {abertos.length ? (
        <PalpitesForm jogos={abertos} />
      ) : (
        <p className="text-sm text-muted">Nenhum jogo aberto para palpite no momento.</p>
      )}

      {fechados.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Lock className="h-4 w-4" /> Jogos já iniciados
          </h2>
          <div className="space-y-2">
            {fechados.map((m) => {
              const p = meus.get(m.id);
              const pts = p ? pontosDoPalpite(p, m) : null;
              const badge = pts !== null ? badgePontos[pts] : null;
              return (
                <div key={m.id} className="glass flex flex-wrap items-center gap-3 p-3.5 text-sm">
                  <span className="hidden w-28 shrink-0 text-xs text-muted sm:block">
                    {rotuloData(m)}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span className="truncate text-right font-medium">{m.mandante}</span>
                    <span className="text-xl">{m.flagMandante}</span>
                  </span>
                  <span className="shrink-0 font-display text-base font-bold tabular-nums">
                    {m.placarMandante ?? "–"} × {m.placarVisitante ?? "–"}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-xl">{m.flagVisitante}</span>
                    <span className="truncate font-medium">{m.visitante}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {p ? `seu palpite: ${p.golsMandante}×${p.golsVisitante}` : "sem palpite"}
                  </span>
                  {badge && (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.txt}
                    </span>
                  )}
                  {m.status === "ao-vivo" && (
                    <span className="shrink-0 rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger">
                      ao vivo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
