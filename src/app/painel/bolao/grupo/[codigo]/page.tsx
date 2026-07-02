import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronUp, ChevronDown, ClipboardList, Crown, Medal, Trophy, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import {
  bonusTravado,
  classificacaoAoVivo,
  ehMembro,
  formaDoGrupo,
  getBonusDoGrupo,
  getGrupoPorCodigo,
  jaComecou,
  liderReconhecido,
  palpitesDoGrupo,
  rankingDoGrupo,
} from "@/lib/bolao";
import { lerPix, pagamentosDoGrupo } from "@/lib/bolao";
import { Forma } from "@/components/painel/forma-bolao";
import { PalpitesJogo } from "@/components/painel/palpites-jogo";
import { AutoRefresh } from "@/components/painel/auto-refresh";
import { getMatches, getTeams } from "@/lib/worldcup";
import { CompartilharConvite, CopiarCodigo } from "./copiar-codigo";
import { CopiarPix } from "./pix-entrada";
import { TogglePagou } from "./toggle-pagou";
import { AvisoLider } from "./aviso-lider";

const MEDALHA = ["text-gold", "text-foreground/70", "text-amber-700"];

/** Seta de quem subiu/desceu na classificação provisória ao vivo. */
function SetaVariacao({ v }: { v: number }) {
  if (v === 0) return null;
  const sobe = v > 0;
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold tabular-nums ${sobe ? "text-success" : "text-danger"}`}
      title={sobe ? `subiu ${v} posição(ões) ao vivo` : `caiu ${-v} posição(ões) ao vivo`}
    >
      {sobe ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {Math.abs(v)}
    </span>
  );
}

/** Selo "+N ao vivo" com pulso, pra deixar claro que o ponto é provisório. */
function PilulaAoVivo({ pts }: { pts: number }) {
  if (pts <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-1.5 py-px text-[10px] font-semibold text-danger">
      <span className="h-1 w-1 animate-pulse rounded-full bg-danger" />+{pts} ao vivo
    </span>
  );
}

export default async function GrupoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!temBanco()) redirect("/painel/bolao");
  const sessao = await getSession();
  if (!sessao || sessao.uid <= 0) redirect("/login?next=/painel/bolao");

  const grupo = await getGrupoPorCodigo(codigo);
  if (!grupo) notFound();
  if (!(await ehMembro(grupo.id, sessao.uid))) redirect("/painel/bolao");

  const [ranking, porJogo, matches, bonusGrupo, teams, forma, pagamentos] =
    await Promise.all([
      rankingDoGrupo(grupo.id),
      palpitesDoGrupo(grupo.id),
      getMatches(),
      getBonusDoGrupo(grupo.id),
      getTeams(),
      formaDoGrupo(grupo.id).catch(() => new Map()),
      pagamentosDoGrupo(grupo.id).catch(() => new Map<number, boolean>()),
    ]);
  const ehDono = grupo.donoId === sessao.uid;
  const mostraPagamento = Boolean(grupo.pix);
  const bonusFechado = bonusTravado(matches);
  const nomeTime = new Map(teams.map((t) => [t.fifa, `${t.flag} ${t.nomePt}`]));

  // Classificação provisória: já incorpora os pontos dos jogos ao vivo ("se acabar agora").
  const { linhas, temAoVivo } = classificacaoAoVivo(ranking, porJogo, matches);

  // Aviso de "novo líder": só quando a liderança TROCA de mãos. Se já é o líder
  // reconhecido (segue líder), não repete. Baseado no ranking OFICIAL (confirmado).
  const lider = ranking[0];
  const souLider = !!lider && lider.usuarioId === sessao.uid && lider.pontos > 0;
  // .catch → na falta da coluna (sem migração), devolve o próprio líder ⇒ não avisa.
  const reconhecido = souLider
    ? await liderReconhecido(grupo.id).catch(() => lider!.usuarioId)
    : null;
  const avisarLider = souLider && reconhecido !== lider!.usuarioId;

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

      {avisarLider && lider && (
        <AvisoLider nome={lider.nome.split(" ")[0]} pontos={lider.pontos} grupoId={grupo.id} />
      )}

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

      {/* PIX some da tela de quem já pagou — mas nunca da tela do dono. */}
      {grupo.pix && (ehDono || !(pagamentos.get(sessao.uid) ?? false)) && (
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

      <Card
        titulo="Classificação"
        className="mb-8"
        acao={
          temAoVivo ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
                provisória · ao vivo
              </span>
              <AutoRefresh segundos={45} />
            </span>
          ) : undefined
        }
      >
        {/* Celular: cards com os PONTOS em destaque (sem scroll lateral) */}
        <ul className="sm:hidden">
          {linhas.map((l, i) => (
            <li
              key={l.usuarioId}
              className={`flex items-center gap-3 border-t border-border/60 py-3 first:border-0 ${
                l.usuarioId === sessao.uid ? "bg-brand/5 -mx-2 rounded-lg px-2" : ""
              }`}
            >
              <span className="flex w-7 shrink-0 flex-col items-center text-center">
                {i < 3 ? (
                  <Medal className={`mx-auto h-5 w-5 ${MEDALHA[i]}`} />
                ) : (
                  <span className="text-sm text-muted">{i + 1}</span>
                )}
                <SetaVariacao v={l.variacao} />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/painel/bolao/grupo/${grupo.codigo}/membro/${l.usuarioId}`}
                  className="flex flex-wrap items-center gap-1.5 font-medium"
                >
                  <span className="truncate">{l.nome}</span>
                  <Forma jogos={forma.get(l.usuarioId) ?? []} />
                  {l.usuarioId === grupo.donoId && <Crown className="h-3.5 w-3.5 shrink-0 text-gold" />}
                  {l.usuarioId === sessao.uid && (
                    <span className="rounded-full bg-brand/15 px-2 py-px text-[10px] font-medium text-brand">
                      você
                    </span>
                  )}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span>
                    🎯 {l.exatos} · ✔ {l.resultados}
                    {l.resultadoVencedor > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-medium text-brand" title="Acertou empate + quem avançou">
                          🏆 {l.resultadoVencedor}
                        </span>
                      </>
                    )}{" "}
                    · {l.palpites} palpite{l.palpites === 1 ? "" : "s"}
                  </span>
                  {mostraPagamento &&
                    (ehDono ? (
                      <TogglePagou
                        grupoId={grupo.id}
                        usuarioId={l.usuarioId}
                        pagou={pagamentos.get(l.usuarioId) ?? false}
                      />
                    ) : pagamentos.get(l.usuarioId) ? (
                      <span className="rounded-full bg-success/15 px-2 py-px text-[10px] font-medium text-success">
                        💰 pago
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-2 px-2 py-px text-[10px] text-muted">
                        pendente
                      </span>
                    ))}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`block font-mono text-2xl font-bold tabular-nums ${l.aoVivo > 0 ? "text-gold" : "text-brand"}`}
                >
                  {l.total}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted">
                  pts{l.bonus > 0 ? ` (+${l.bonus})` : ""}
                </span>
                {l.aoVivo > 0 && (
                  <span className="mt-1 block">
                    <PilulaAoVivo pts={l.aoVivo} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: tabela completa */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[480px] text-sm tabela-zebra">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-3 pl-1">#</th>
                <th className="pb-3">Participante</th>
                <th className="pb-3 text-center" title="Placares exatos (3 pts)">Exatos</th>
                <th className="pb-3 text-center" title="Acertou vencedor/empate (1 pt)">Resultados</th>
                <th
                  className="pb-3 text-center text-brand"
                  title="Acertou empate nos 90' + quem avançou (+1 bônus)"
                >
                  Res.+Venc.
                </th>
                <th className="pb-3 text-center">Palpites</th>
                {mostraPagamento && (
                  <th className="pb-3 text-center" title="Pagou a entrada do bolão?">Entrada</th>
                )}
                <th className="pb-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr
                  key={l.usuarioId}
                  className={`border-t border-border/60 ${l.usuarioId === sessao.uid ? "bg-brand/5" : ""}`}
                >
                  <td className="py-3 pl-1">
                    <span className="inline-flex items-center gap-1">
                      {i < 3 ? (
                        <Medal className={`h-5 w-5 ${MEDALHA[i]}`} />
                      ) : (
                        <span className="pl-1 text-muted">{i + 1}</span>
                      )}
                      <SetaVariacao v={l.variacao} />
                    </span>
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
                      <Forma jogos={forma.get(l.usuarioId) ?? []} />
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
                  <td className="py-3 text-center tabular-nums font-medium text-brand">
                    {l.resultadoVencedor > 0 ? l.resultadoVencedor : "–"}
                  </td>
                  <td className="py-3 text-center tabular-nums text-muted">{l.palpites}</td>
                  {mostraPagamento && (
                    <td className="py-3 text-center">
                      {ehDono ? (
                        <TogglePagou
                          grupoId={grupo.id}
                          usuarioId={l.usuarioId}
                          pagou={pagamentos.get(l.usuarioId) ?? false}
                        />
                      ) : pagamentos.get(l.usuarioId) ? (
                        <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                          💰 pago
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                          pendente
                        </span>
                      )}
                    </td>
                  )}
                  <td className="py-3 text-right font-display text-base font-bold tabular-nums">
                    <span className={l.aoVivo > 0 ? "text-gold" : ""}>{l.total}</span>
                    {l.aoVivo > 0 && (
                      <span className="ml-1.5 align-middle">
                        <PilulaAoVivo pts={l.aoVivo} />
                      </span>
                    )}
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
          {temAoVivo ? (
            <>
              🔴 Classificação <strong>provisória</strong>: já inclui os pontos dos jogos ao vivo
              (vale o placar de agora) — os pontos só ficam <strong>definitivos</strong> quando o
              jogo encerra.{" "}
            </>
          ) : null}
          Desempate: mais placares exatos. Pontos contam só de jogos encerrados. Bônus: campeã +10
          e artilheiro +5 no fim da Copa. 👀 Clique num participante para ver todos os palpites
          dele nos jogos já iniciados.
        </p>
      </Card>

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
              <PalpitesJogo
                key={m.id}
                m={m}
                palpites={porJogo.get(m.id) ?? []}
                meuId={sessao.uid}
              />
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
