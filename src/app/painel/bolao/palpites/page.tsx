import Link from "next/link";
import { ArrowLeft, Database, Dices, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import {
  bonusTravado,
  detalhePalpite,
  ehMataMata,
  emProrrogacao,
  getBonus,
  jaComecou,
  palpitesDoUsuario,
  placarValido,
} from "@/lib/bolao";
import { getMatches, getTeams } from "@/lib/worldcup";
import { listConvocados } from "@/lib/worldcup/squads";
import type { Match } from "@/lib/worldcup/types";
import { BonusForm } from "./bonus-form";
import { TagAoVivo } from "@/components/painel/placar-fx";
import { IndicadorVencedorEmpate } from "@/components/painel/indicador-vencedor-empate";
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
      mataMata: ehMataMata(m),
      fifaMandante: m.fifaMandante,
      fifaVisitante: m.fifaVisitante,
      vencedorAtual: p?.vencedorFifa ?? null,
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

      <Card titulo="Como pontua" className="mb-8">
        <ul className="space-y-1.5 text-sm">
          <li>
            🎯 <strong className="text-gold">Placar exato</strong> = 3 pts
          </li>
          <li>
            ✅ Acertou só o <strong className="text-brand">resultado</strong> (vencedor ou empate) = 1
            pt
          </li>
          <li>❌ Errou o resultado = 0</li>
        </ul>
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-3.5">
          <p className="text-sm font-medium text-gold">
            🏆 Mata-mata: palpitou empate? Escolha quem avança (opcional) — vale{" "}
            <strong>+1 BÔNUS</strong> se o jogo empatar nos 90 min e você acertar quem passou.
          </p>
          <p className="mt-1.5 text-xs text-muted">
            O +1 é só bônus: <strong>errar (ou não escolher) o vencedor nunca tira</strong> os pontos
            do placar/resultado.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr className="border-b border-border/60">
                  <th className="py-1.5 pr-3 font-medium">Palpite</th>
                  <th className="py-1.5 pr-3 font-medium">Deu nos 90&apos;</th>
                  <th className="py-1.5 pr-3 font-medium">Vencedor</th>
                  <th className="py-1.5 font-medium">Pontos</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[
                  ["1×1", "1×1", "acertou quem passou", "3 + 1 = 4", "text-gold font-semibold"],
                  ["1×1", "1×1", "errou / não escolheu", "3", "text-foreground"],
                  ["1×1", "2×2", "acertou quem passou", "1 + 1 = 2", "text-brand font-semibold"],
                  ["1×1", "2×2", "errou / não escolheu", "1", "text-foreground"],
                  ["1×1", "2×1 (decidiu nos 90')", "—", "0", "text-muted"],
                ].map(([pa, deu, venc, pts, cls], k) => (
                  <tr key={k} className="border-b border-border/30 last:border-0">
                    <td className="py-1.5 pr-3">{pa}</td>
                    <td className="py-1.5 pr-3">{deu}</td>
                    <td className="py-1.5 pr-3">{venc}</td>
                    <td className={`py-1.5 ${cls}`}>{pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

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
              ⚠️ <strong className="text-gold">Pense bem: depois de salvar é definitivo</strong> —
              não dá para trocar. Os pontos entram no fim da Copa.
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
              const d = p && m.status !== "agendado" ? detalhePalpite(p, m) : null;
              const badge = d ? badgePontos[d.base] : null;
              const prorrogacao = emProrrogacao(m);
              const placar90 = placarValido(m);
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
                  <span className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs text-muted">
                    {p ? (
                      <>
                        <span>
                          seu palpite: {p.golsMandante}×{p.golsVisitante}
                        </span>
                        <IndicadorVencedorEmpate m={m} palpite={p} compact />
                      </>
                    ) : (
                      "sem palpite"
                    )}
                  </span>
                  {badge && (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.txt}
                    </span>
                  )}
                  {d && d.bonus > 0 && (
                    <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
                      {d.bonusProvisorio ? "+1 provisório 🏆" : "+1 vencedor 🏆"}
                    </span>
                  )}
                  {d && m.status === "ao-vivo" && (
                    <span className="shrink-0 font-display text-xs font-semibold tabular-nums text-brand">
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
        </section>
      )}
    </>
  );
}
