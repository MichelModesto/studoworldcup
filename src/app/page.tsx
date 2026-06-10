import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Globe2,
  LineChart,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { HeroOrb } from "@/components/fx/hero-orb";
import { TeamsMarquee } from "@/components/fx/teams-marquee";
import { Reveal, RevealItem, RevealStagger } from "@/components/motion/reveal";
import { Counter } from "@/components/motion/counter";
import { TOURNAMENT, getTeams, getStadiums } from "@/lib/worldcup";

function destaqueSede(estadio: string): string | undefined {
  if (/azteca/i.test(estadio)) return "Abertura";
  if (/metlife/i.test(estadio)) return "Final";
  return undefined;
}

export default async function Home() {
  const [teams, stadiums] = await Promise.all([getTeams(), getStadiums()]);
  const sedes = [...stadiums]
    .sort((a, b) => b.capacidade - a.capacidade)
    .slice(0, 6);

  return (
    <main className="flex-1">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#recursos" className="transition hover:text-foreground">Recursos</a>
            <a href="#sedes" className="transition hover:text-foreground">Sedes</a>
            <a href="#sobre" className="transition hover:text-foreground">Sobre</a>
          </nav>
          <Link
            href="/login"
            className="btn-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
          >
            Entrar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-10 pt-16 md:pt-24 lg:grid-cols-2">
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
              <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
                A Copa do Mundo <span className="text-gradient text-glow">2026</span> em
                dados que importam
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-pretty text-lg text-muted">
                Painéis interativos com seleções, jogos, grupos, artilheiros e
                estatísticas em tempo real. O maior Mundial da história — 48
                seleções, 16 cidades, 3 países.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="btn-brand inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base"
                >
                  Acessar painel <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#recursos"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface/60 px-7 py-3.5 text-base text-foreground transition hover:border-brand/40"
                >
                  Ver recursos
                </a>
              </div>
            </Reveal>
          </div>

          <HeroOrb />
        </div>

        {/* KPIs com contador */}
        <div className="mx-auto max-w-7xl px-6 pb-10">
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
                    className="mt-3 block font-display text-4xl font-bold tracking-tight"
                  />
                  <div className="mt-1 text-xs uppercase tracking-wide text-muted">
                    {k.label}
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* MARQUEE */}
      <TeamsMarquee teams={teams} />

      {/* RECURSOS (bento) */}
      <section id="recursos" className="mx-auto max-w-7xl px-6 py-20">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Tudo para <span className="text-gradient">acompanhar o Mundial</span>
            </h2>
            <p className="mt-4 text-muted">
              Plataforma pensada para fãs, analistas e curiosos. Dados claros,
              visual moderno e navegação intuitiva.
            </p>
          </div>
        </Reveal>

        <RevealStagger className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: BarChart3, titulo: "Estatísticas ao vivo", desc: "Gols, posse, finalizações e desempenho por seleção e rodada." },
            { icon: Users, titulo: "Seleções & elencos", desc: "As 48 seleções classificadas, ranking FIFA e confederações." },
            { icon: CalendarDays, titulo: "Calendário de jogos", desc: "Todos os 104 jogos, resultados e próximos confrontos." },
            { icon: Trophy, titulo: "Grupos & classificação", desc: "Tabela atualizada dos 12 grupos com saldo e pontos." },
            { icon: LineChart, titulo: "Artilheiros", desc: "Ranking de gols e assistências dos craques do torneio." },
            { icon: Globe2, titulo: "Sedes & estádios", desc: "As 16 cidades anfitriãs em 3 países e seus estádios." },
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
      <section id="sedes" className="mx-auto max-w-7xl px-6 py-20">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
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
                  <p className="mt-3 text-sm text-brand">
                    {c.capacidade.toLocaleString("pt-BR")} lugares
                  </p>
                </div>
              </RevealItem>
            );
          })}
        </RevealStagger>
      </section>

      {/* CTA */}
      <section id="sobre" className="mx-auto max-w-7xl px-6 py-20">
        <Reveal>
          <div className="glass neon-border relative overflow-hidden p-10 text-center md:p-16">
            <Trophy className="mx-auto h-12 w-12 text-gold animate-float" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
              Pronto para mergulhar nos números da Copa?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Faça login e explore os painéis. Em breve com ainda mais dados e
              insights potencializados por IA.
            </p>
            <Link
              href="/login"
              className="btn-brand mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base"
            >
              <Sparkles className="h-5 w-5" /> Entrar agora
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <Logo />
          <p className="text-sm text-muted">
            © 2026 StudoWorldCup · Estatísticas da Copa do Mundo
          </p>
        </div>
      </footer>
    </main>
  );
}
