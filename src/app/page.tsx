import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Dices,
  Globe2,
  MapPin,
  Medal,
  Share2,
  ShieldCheck,
  Swords,
  Target,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { PainelHero, type JogoHero } from "@/components/fx/painel-hero";
import { ResultadosMarquee } from "@/components/fx/resultados-marquee";
import { TeamsMarquee } from "@/components/fx/teams-marquee";
import { Reveal, RevealItem, RevealStagger } from "@/components/motion/reveal";
import { Counter } from "@/components/motion/counter";
import { TOURNAMENT, getMatches, getTeams, getStadiums } from "@/lib/worldcup";
import { sql, temBanco } from "@/lib/db";

// O hero mostra jogo ao vivo/próximo — mantém a fachada fresca.
export const revalidate = 60;

function destaqueSede(estadio: string): string | undefined {
  if (/azteca/i.test(estadio)) return "Abertura";
  if (/metlife/i.test(estadio)) return "Final";
  return undefined;
}

/** Jogo do telão: o que está rolando agora ou o próximo a começar. */
function jogoDoTelao(jogos: Awaited<ReturnType<typeof getMatches>>): JogoHero | null {
  const agora = Date.now();
  const aoVivo = jogos.find((m) => m.status === "ao-vivo");
  const proximo = jogos
    .filter((m) => m.kickoffISO && Date.parse(m.kickoffISO) > agora)
    .sort((a, b) => a.kickoffISO!.localeCompare(b.kickoffISO!))[0];
  const m = aoVivo ?? proximo;
  if (!m) return null;
  return {
    mandante: m.mandante,
    visitante: m.visitante,
    flagMandante: m.flagMandante,
    flagVisitante: m.flagVisitante,
    fifaMandante: m.fifaMandante,
    fifaVisitante: m.fifaVisitante,
    kickoffISO: m.kickoffISO,
    placarMandante: m.placarMandante,
    placarVisitante: m.placarVisitante,
    status: m.status,
    fase: m.grupo ? `${m.fase} · Grupo ${m.grupo}` : m.fase,
    estadio: m.estadio,
    cidade: m.cidade,
  };
}

async function provaSocial(): Promise<{ palpites: number; grupos: number } | null> {
  if (!temBanco()) return null;
  try {
    const rows = (await sql()`
      SELECT (SELECT count(*)::int FROM palpites) AS palpites,
             (SELECT count(*)::int FROM grupos) AS grupos
    `) as { palpites: number; grupos: number }[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

const MOCK_RANKING = [
  { pos: "🥇", nome: "Ana", pontos: 23, badges: "🎯🔥" },
  { pos: "🥈", nome: "Você?", pontos: 21, badges: "💯", voce: true },
  { pos: "🥉", nome: "Marcão", pontos: 18, badges: "🥶" },
];

export default async function Home() {
  const [teams, stadiums, matches, social] = await Promise.all([
    getTeams(),
    getStadiums(),
    getMatches(),
    provaSocial(),
  ]);
  const sedes = [...stadiums].sort((a, b) => b.capacidade - a.capacidade).slice(0, 6);
  const telao = jogoDoTelao(matches);

  return (
    <main className="flex-1">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#bolao" className="transition hover:text-foreground">Bolão</a>
            <a href="#recursos" className="transition hover:text-foreground">Recursos</a>
            <a href="#sedes" className="transition hover:text-foreground">Sedes</a>
          </nav>
          <Link
            href="/login"
            className="btn-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
          >
            Entrar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* HERO — a fachada do estádio */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-12 pt-14 md:pt-20 lg:grid-cols-2">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                {TOURNAMENT.sedes.join(" · ")} — Jun a Jul de 2026
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-6 text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">
                Seu QG da <span className="text-gradient text-glow">Copa 2026</span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-pretty text-lg text-muted">
                Placar ao vivo, estatísticas de verdade e o <strong className="text-foreground">bolão
                para zoar os amigos</strong> — tudo num lugar só. Chama a família, o pessoal
                da firma, o grupo do futebol. Palpite fechado, ranking na parede.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="btn-brand inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base"
                >
                  <Dices className="h-5 w-5" /> Criar meu bolão grátis
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface/60 px-7 py-3.5 text-base text-foreground transition hover:border-brand/40"
                >
                  Ver o painel <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>

            {social && social.palpites > 0 && (
              <Reveal delay={0.3}>
                <p className="mt-6 text-sm text-muted">
                  ⚽ <strong className="text-brand">{social.palpites.toLocaleString("pt-BR")}</strong>{" "}
                  palpites já registrados em{" "}
                  <strong className="text-brand">{social.grupos}</strong> grupo
                  {social.grupos === 1 ? "" : "s"} na disputa.
                </p>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.12}>
            <PainelHero jogo={telao} />
          </Reveal>
        </div>
      </section>

      {/* LETREIRO DE RESULTADOS */}
      <ResultadosMarquee jogos={matches} />

      {/* KPIs */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <RevealStagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Seleções", value: TOURNAMENT.selecoes, icon: Users },
            { label: "Grupos", value: TOURNAMENT.grupos, icon: ShieldCheck },
            { label: "Cidades-sede", value: TOURNAMENT.cidades, icon: MapPin },
            { label: "Jogos", value: TOURNAMENT.jogos, icon: CalendarDays },
          ].map((k) => (
            <RevealItem key={k.label}>
              <div className="glass glass-hover p-5 text-center">
                <k.icon className="mx-auto h-5 w-5 text-brand" />
                <Counter
                  value={k.value}
                  className="mt-3 block font-mono text-4xl font-bold tabular-nums tracking-tight"
                />
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
                  {k.label}
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </section>

      {/* BOLÃO — o produto estrela */}
      <section id="bolao" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                O bolão que a sua <span className="text-gradient">galera merece</span>
              </h2>
              <p className="mt-4 max-w-lg text-muted">
                Sem planilha, sem confusão, sem &quot;esqueci de anotar&quot;. Os pontos contam
                sozinhos minuto a minuto, com direito a zoeira oficial no ranking.
              </p>

              <ol className="mt-8 space-y-4">
                {[
                  { icon: Dices, txt: <><strong>Crie o grupo</strong> — você ganha um código de 6 letras e um link de convite.</> },
                  { icon: Share2, txt: <><strong>Manda no WhatsApp</strong> — cada um cria a conta grátis e entra com o código.</> },
                  { icon: ClipboardList, txt: <><strong>Todo mundo palpita</strong> — os 104 jogos, com lembrete pra ninguém vacilar.</> },
                ].map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                      <p.icon className="h-4 w-4" />
                    </span>
                    <span className="pt-1.5 text-sm text-foreground/90">{p.txt}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex flex-wrap gap-2 text-xs">
                {[
                  ["Placar exato", "3 pts", "text-gold bg-gold/10"],
                  ["Acertou o vencedor", "1 pt", "text-brand bg-brand/10"],
                  ["Campeã do mundo", "+10", "text-gold bg-gold/10"],
                  ["Artilheiro da Copa", "+5", "text-brand bg-brand/10"],
                ].map(([rotulo, pts, cls]) => (
                  <span key={rotulo} className={`rounded-full px-3 py-1.5 font-medium ${cls}`}>
                    {rotulo} <strong>{pts}</strong>
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* mock do ranking com a cara do produto */}
          <Reveal delay={0.15}>
            <div className="glass neon-border p-6">
              <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-muted">
                Classificação · Bolão da Firma
              </p>
              <ul className="space-y-2.5">
                {MOCK_RANKING.map((l) => (
                  <li
                    key={l.nome}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                      l.voce ? "border border-brand/40 bg-brand/10" : "bg-surface-2/60"
                    }`}
                  >
                    <span className="text-xl">{l.pos}</span>
                    <span className="flex-1 font-medium">
                      {l.nome} <span className="ml-1 text-sm">{l.badges}</span>
                    </span>
                    <span className="font-mono text-lg font-bold tabular-nums text-brand">
                      {l.pontos} pts
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                <Medal className="h-3.5 w-3.5 text-gold" />
                Badges de zoeira inclusos: 🎯 na mosca · 🔥 em chamas · 🥶 gelado · 🦓 zebrólogo
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="mx-auto max-w-7xl px-6 py-16">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              E quando não é dia de jogo, <span className="text-gradient">tem dado</span>
            </h2>
            <p className="mt-4 text-muted">
              Tudo com dados reais, atualizados sozinhos — de placar ao vivo a foto de
              convocado.
            </p>
          </div>
        </Reveal>

        <RevealStagger className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: BarChart3, titulo: "Placar e lance a lance", desc: "Gols, cartões, escalações e estatísticas de cada jogo em tempo quase real." },
            { icon: Swords, titulo: "Mata-mata", desc: "O chaveamento dos 16-avos à final, preenchendo sozinho conforme a Copa anda." },
            { icon: Target, titulo: "Artilheiros", desc: "Ranking de goleadores com foto, atualizado a cada gol." },
            { icon: Users, titulo: "48 seleções com dossiê", desc: "Elencos convocados com foto, estatísticas e análises de cada seleção." },
            { icon: ShieldCheck, titulo: "Grupos + simulador", desc: "Classificação ao vivo e o simulador 'e se...?' para testar cenários." },
            { icon: Globe2, titulo: "Confronto a confronto", desc: "Probabilidades, gols esperados e radar do apostador para cada duelo." },
          ].map((f) => (
            <RevealItem key={f.titulo}>
              <div className="glass glass-hover group h-full p-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand transition group-hover:scale-110 group-hover:bg-brand/20">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.titulo}</h3>
                <p className="mt-2 text-sm text-muted">{f.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </section>

      {/* SEDES */}
      <section id="sedes" className="mx-auto max-w-7xl px-6 py-16">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              16 cidades, <span className="text-gradient">3 países</span>
            </h2>
            <p className="mt-4 text-muted">
              Pela primeira vez, a Copa do Mundo será sediada por três nações.
            </p>
          </div>
        </Reveal>

        <RevealStagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sedes.map((c) => {
            const destaque = destaqueSede(c.estadio);
            return (
              <RevealItem key={c.estadio}>
                <div className="glass glass-hover h-full overflow-hidden p-6">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
                      {c.pais}
                    </span>
                    {destaque && (
                      <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
                        {destaque}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{c.cidade}</h3>
                  <p className="mt-1 text-sm text-muted">{c.estadio}</p>
                  <p className="mt-3 font-mono text-sm tabular-nums text-brand">
                    {c.capacidade.toLocaleString("pt-BR")} lugares
                  </p>
                </div>
              </RevealItem>
            );
          })}
        </RevealStagger>
      </section>

      {/* MARQUEE DE SELEÇÕES */}
      <TeamsMarquee teams={teams} />

      {/* CTA FINAL */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <Reveal>
          <div className="glass neon-border relative overflow-hidden p-10 text-center md:p-16">
            <p className="font-mono text-sm uppercase tracking-[0.3em] text-brand">
              A bola já está rolando
            </p>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              Monta o bolão hoje e manda o código no grupo
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Leva menos de um minuto: cria a conta, batiza o grupo e pronto — é só
              palpitar e zoar quem ficar em último.
            </p>
            <Link
              href="/login"
              className="btn-brand mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base"
            >
              <Dices className="h-5 w-5" /> Começar agora — é grátis
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <Logo />
              <p className="text-xs text-muted">Feito por torcedor, para torcedores. 🟡⚫</p>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
              <Link href="/login" className="transition hover:text-foreground">Painel</Link>
              <Link href="/login" className="transition hover:text-foreground">Bolão</Link>
              <a href="#sedes" className="transition hover:text-foreground">Sedes</a>
            </nav>
          </div>
          <p className="mt-8 text-center text-xs text-muted/70 md:text-left">
            © 2026 StudoWorldCup · Dados: ESPN (placares e estatísticas), openfootball
            (calendário oficial) e TheSportsDB (fotos dos jogadores). Sem afiliação com a FIFA.
          </p>
        </div>
      </footer>
    </main>
  );
}
