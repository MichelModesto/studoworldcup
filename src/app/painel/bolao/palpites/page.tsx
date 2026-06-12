import Link from "next/link";
import { ArrowLeft, Database, Dices, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import {
  bonusTravado,
  getBonus,
  jaComecou,
  palpitesDoUsuario,
  pontosDoPalpite,
} from "@/lib/bolao";
import { getMatches, getTeams } from "@/lib/worldcup";
import { listConvocados } from "@/lib/worldcup/squads";
import type { Match } from "@/lib/worldcup/types";
import { BonusForm } from "./bonus-form";
import { TagAoVivo } from "@/components/painel/placar-fx";
import { PalpitesForm, type JogoAberto } from "./palpites-form";

export const metadata = { title: "Meus palpites" };

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

  const [matches, meus, bonus, teams, convocados] = await Promise.all([
    getMatches(),
    palpitesDoUsuario(sessao.uid),
    getBonus(sessao.uid),
    getTeams(),
    listConvocados(),
  ]);
  const ordenados = [...matches].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const bonusFechado = bonusTravado(matches);
  const nomeTime = new Map(teams.map((t) => [t.fifa, `${t.flag} ${t.nomePt}`]));

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

      <Card
        titulo={`Palpites bônus ${bonusFechado ? "(fechados)" : "(abertos até o mata-mata)"}`}
        className="mb-8"
      >
        {bonusFechado ? (
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              🏆 Campeã:{" "}
              <strong>
                {bonus.campeaoFifa ? (nomeTime.get(bonus.campeaoFifa) ?? bonus.campeaoFifa) : "—"}
              </strong>
            </span>
            <span>
              👟 Artilheiro: <strong>{bonus.artilheiro ?? "—"}</strong>
            </span>
            <span className="text-xs text-muted">
              Pontuam no fim da Copa: +10 campeã · +5 artilheiro.
            </span>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Aposte na <strong>campeã (+10 pts)</strong> e no <strong>artilheiro (+5 pts)</strong>.
              Pode mudar quantas vezes quiser até o início do mata-mata; os pontos entram no fim da
              Copa.
            </p>
            <BonusForm
              times={teams.map((t) => ({ fifa: t.fifa, nomePt: t.nomePt, flag: t.flag }))}
              jogadores={convocados}
              campeaoAtual={bonus.campeaoFifa}
              artilheiroAtual={bonus.artilheiro}
            />
          </>
        )}
      </Card>

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
                  {m.status === "ao-vivo" && <TagAoVivo texto="ao vivo" />}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
