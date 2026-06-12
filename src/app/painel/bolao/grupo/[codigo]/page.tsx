import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, Crown, Medal, Trophy, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import {
  bonusTravado,
  conquistasDoGrupo,
  ehMembro,
  evolucaoDoGrupo,
  getBonusDoGrupo,
  getGrupoPorCodigo,
  jaComecou,
  palpitesDoGrupo,
  pontosDoPalpite,
  rankingDoGrupo,
} from "@/lib/bolao";
import { lerPix } from "@/lib/bolao";
import { RankingChart } from "@/components/charts/ranking-chart";
import { getMatches, getTeams } from "@/lib/worldcup";
import { TagAoVivo } from "@/components/painel/placar-fx";
import { CompartilharConvite, CopiarCodigo } from "./copiar-codigo";
import { CopiarPix } from "./pix-entrada";

const MEDALHA = ["text-gold", "text-foreground/70", "text-amber-700"];

export default async function GrupoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!temBanco()) redirect("/painel/bolao");
  const sessao = await getSession();
  if (!sessao || sessao.uid <= 0) redirect("/login?next=/painel/bolao");

  const grupo = await getGrupoPorCodigo(codigo);
  if (!grupo) notFound();
  if (!(await ehMembro(grupo.id, sessao.uid))) redirect("/painel/bolao");

  const [ranking, porJogo, matches, bonusGrupo, teams, evolucao, conquistas] = await Promise.all([
    rankingDoGrupo(grupo.id),
    palpitesDoGrupo(grupo.id),
    getMatches(),
    getBonusDoGrupo(grupo.id),
    getTeams(),
    evolucaoDoGrupo(grupo.id).catch(() => ({ dias: [], nomes: [] })),
    conquistasDoGrupo(grupo.id).catch(() => new Map<number, { emoji: string; titulo: string }[]>()),
  ]);
  const bonusFechado = bonusTravado(matches);
  const nomeTime = new Map(teams.map((t) => [t.fifa, `${t.flag} ${t.nomePt}`]));

  // Palpites do grupo só aparecem para jogos já iniciados (ninguém cola de ninguém).
  const iniciados = matches
    .filter((m) => jaComecou(m) && porJogo.has(m.id))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, 10);

  return (
    <>
      <Link
        href="/painel/bolao"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Bolão
      </Link>

      <div className="glass neon-border mb-7 flex flex-wrap items-center gap-5 p-6">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{grupo.nome}</h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
            <Users className="h-4 w-4" /> {grupo.membros} participante(s) · placar exato 3 pts ·
            resultado 1 pt
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <p className="text-xs text-muted">Convide com este código:</p>
          <CopiarCodigo codigo={grupo.codigo} />
          <CompartilharConvite codigo={grupo.codigo} nomeGrupo={grupo.nome} />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          href="/painel/bolao/palpites"
          className="btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium"
        >
          <ClipboardList className="h-4 w-4" /> Fazer meus palpites
        </Link>
      </div>

      {grupo.pix && (
        <Card titulo="💰 Entrada do bolão (PIX)" className="mb-8">
          {(() => {
            const info = lerPix(grupo.pix!);
            return (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div>
                  {info.valor && (
                    <p className="font-mono text-3xl font-bold tabular-nums text-brand">
                      R${" "}
                      {Number(info.valor).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">
                    {info.nome ? `PIX para ${info.nome}` : "PIX copia e cola"} · pague e avise no
                    grupo 😉
                  </p>
                </div>
                <CopiarPix pix={grupo.pix} />
                <p className="w-full text-xs text-muted/70">
                  Copie o código e cole na opção <strong>PIX copia e cola</strong> do app do seu
                  banco.
                </p>
              </div>
            );
          })()}
        </Card>
      )}

      <Card titulo="Classificação" className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm tabela-zebra">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-3 pl-1">#</th>
                <th className="pb-3">Participante</th>
                <th className="pb-3 text-center" title="Placares exatos (3 pts)">Exatos</th>
                <th className="pb-3 text-center" title="Acertou vencedor/empate (1 pt)">Resultados</th>
                <th className="pb-3 text-center">Palpites</th>
                <th className="pb-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((l, i) => (
                <tr
                  key={l.usuarioId}
                  className={`border-t border-border/60 ${l.usuarioId === sessao.uid ? "bg-brand/5" : ""}`}
                >
                  <td className="py-3 pl-1">
                    {i < 3 ? (
                      <Medal className={`h-5 w-5 ${MEDALHA[i]}`} />
                    ) : (
                      <span className="pl-1 text-muted">{i + 1}</span>
                    )}
                  </td>
                  <td className="py-3 font-medium">
                    <Link
                      href={`/painel/bolao/grupo/${grupo.codigo}/membro/${l.usuarioId}`}
                      className="group/membro inline-flex items-center gap-1.5"
                      title={`Ver os palpites de ${l.nome} (jogos já iniciados)`}
                    >
                      <span className="transition group-hover/membro:text-brand group-hover/membro:underline">
                        {l.nome}
                      </span>
                      {(conquistas.get(l.usuarioId) ?? []).map((c) => (
                        <span key={c.emoji} title={c.titulo} className="cursor-help text-sm">
                          {c.emoji}
                        </span>
                      ))}
                      {l.usuarioId === grupo.donoId && (
                        <span title="Dono do grupo">
                          <Crown className="h-3.5 w-3.5 text-gold" />
                        </span>
                      )}
                      {l.usuarioId === sessao.uid && (
                        <span className="rounded-full bg-brand/15 px-2 py-px text-[10px] font-medium text-brand">
                          você
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="py-3 text-center tabular-nums">{l.exatos}</td>
                  <td className="py-3 text-center tabular-nums">{l.resultados}</td>
                  <td className="py-3 text-center tabular-nums text-muted">{l.palpites}</td>
                  <td className="py-3 text-right font-display text-base font-bold tabular-nums">
                    {l.pontos}
                    {l.bonus > 0 && (
                      <span className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-px align-middle text-[10px] font-medium text-gold">
                        +{l.bonus} bônus
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted/70">
          Desempate: mais placares exatos. Pontos contam só de jogos encerrados. Bônus: campeã +10
          e artilheiro +5 no fim da Copa. 👀 Clique num participante para ver todos os palpites
          dele nos jogos já iniciados.
        </p>
      </Card>

      {evolucao.dias.length >= 2 && (
        <Card titulo="Evolução do ranking (pontos acumulados por dia)" className="mb-8">
          <RankingChart dias={evolucao.dias} nomes={evolucao.nomes} />
        </Card>
      )}

      {bonusGrupo.size > 0 && (
        <Card titulo="Apostas bônus do grupo" className="mb-8">
          {bonusFechado ? (
            <div className="flex flex-wrap gap-2">
              {ranking
                .filter((l) => bonusGrupo.has(l.usuarioId))
                .map((l) => {
                  const b = bonusGrupo.get(l.usuarioId)!;
                  return (
                    <span
                      key={l.usuarioId}
                      className="rounded-full bg-surface-2 px-3 py-1.5 text-xs"
                    >
                      <strong>{l.nome}</strong>
                      {b.campeaoFifa && ` · 🏆 ${nomeTime.get(b.campeaoFifa) ?? b.campeaoFifa}`}
                      {b.artilheiro && ` · 👟 ${b.artilheiro}`}
                    </span>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-muted">
              🤫 {bonusGrupo.size} participante(s) já apostaram na campeã/artilheiro — as apostas
              ficam secretas até o início do mata-mata.
            </p>
          )}
        </Card>
      )}

      {iniciados.length > 0 && (
        <Card titulo="Palpites do grupo (jogos já iniciados)">
          <div className="space-y-4">
            {iniciados.map((m) => (
              <div key={m.id} className="border-b border-border/40 pb-4 last:border-0 last:pb-0">
                <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span>{m.flagMandante}</span> {m.mandante}
                  <span className="font-display font-bold tabular-nums">
                    {m.placarMandante ?? "–"} × {m.placarVisitante ?? "–"}
                  </span>
                  {m.visitante} <span>{m.flagVisitante}</span>
                  {m.status === "ao-vivo" && <TagAoVivo texto="ao vivo" />}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(porJogo.get(m.id) ?? []).map((p) => {
                    const pts = pontosDoPalpite(p.palpite, m);
                    const cls =
                      pts === 3
                        ? "bg-gold/15 text-gold"
                        : pts === 1
                          ? "bg-brand/15 text-brand"
                          : "bg-surface-2 text-muted";
                    return (
                      <span
                        key={p.usuarioId}
                        className={`rounded-full px-2.5 py-1 text-xs ${cls}`}
                        title={pts !== null ? `${pts} ponto(s)` : "aguardando fim do jogo"}
                      >
                        {p.nome}: {p.palpite.golsMandante}×{p.palpite.golsVisitante}
                      </span>
                    );
                  })}
                </div>
                {(() => {
                  const ps = porJogo.get(m.id) ?? [];
                  if (ps.length < 2) return null;
                  const lado = (s: number) => ps.filter((p) => Math.sign(p.palpite.golsMandante - p.palpite.golsVisitante) === s).length;
                  const pct = (n: number) => Math.round((n / ps.length) * 100);
                  return (
                    <p className="mt-2 text-[11px] text-muted/80">
                      {pct(lado(1))}% em {m.mandante} · {pct(lado(0))}% no empate · {pct(lado(-1))}%
                      em {m.visitante}
                    </p>
                  );
                })()}
              </div>
            ))}
          </div>
        </Card>
      )}

      {ranking.every((l) => l.palpites === 0) && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Trophy className="h-4 w-4 text-gold" /> Ninguém palpitou ainda — seja o primeiro e abra
          vantagem!
        </p>
      )}
    </>
  );
}
