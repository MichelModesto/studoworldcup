import Link from "next/link";
import { ClipboardList, Crown, Database, Dices, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import { meusGrupos, rankingDoGrupo } from "@/lib/bolao";
import { AvisosBolao } from "@/components/painel/avisos-bolao";
import { AtivarLembretes } from "@/components/painel/lembretes";
import { CriarGrupoForm, EntrarGrupoForm } from "./forms";

export default async function BolaoPage() {
  const sessao = await getSession();

  if (!temBanco()) {
    return (
      <>
        <PageHeader
          titulo="Bolão"
          descricao="Crie um grupo, convide os amigos pelo código e dispute o ranking de palpites."
        />
        <EmptyState
          icon={Database}
          titulo="Falta ligar o banco de dados (grátis)"
          descricao={`Para o bolão guardar contas, grupos e palpites: crie um Postgres gratuito (Neon) na Vercel em Storage → Create Database → Neon, conecte ao projeto e rode "npm run db:init". Detalhes no README.`}
        />
      </>
    );
  }

  if (!sessao || sessao.uid <= 0) {
    return (
      <>
        <PageHeader
          titulo="Bolão"
          descricao="Crie um grupo, convide os amigos pelo código e dispute o ranking de palpites."
        />
        <EmptyState
          icon={Dices}
          titulo="Crie sua conta para palpitar"
          descricao="Cada participante tem o próprio login. Crie sua conta gratuita na tela de entrada e volte aqui para montar seu grupo."
        />
        <div className="mt-4 text-center">
          <Link href="/login" className="btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm">
            Criar minha conta
          </Link>
        </div>
      </>
    );
  }

  const grupos = await meusGrupos(sessao.uid);
  // posição do usuário em cada grupo (poucos grupos por pessoa; ok calcular aqui)
  const posicoes = new Map<number, { pos: number; pontos: number }>();
  for (const g of grupos) {
    const ranking = await rankingDoGrupo(g.id);
    const i = ranking.findIndex((l) => l.usuarioId === sessao.uid);
    if (i >= 0) posicoes.set(g.id, { pos: i + 1, pontos: ranking[i].pontos });
  }

  return (
    <>
      <PageHeader
        titulo="Bolão"
        descricao={`Olá, ${sessao.nome}! Placar exato vale 3 pontos; acertar o vencedor (ou empate), 1 ponto.`}
      />

      <AvisosBolao />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          href="/painel/bolao/palpites"
          className="btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium"
        >
          <ClipboardList className="h-4 w-4" /> Fazer meus palpites
        </Link>
        <AtivarLembretes />
        <p className="text-xs text-muted">
          Seus palpites valem em todos os seus grupos e travam no apito inicial.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Criar um grupo">
          <p className="mb-4 text-sm text-muted">
            Você vira o dono e recebe um código de 6 caracteres para convidar a galera.
          </p>
          <CriarGrupoForm />
        </Card>
        <Card titulo="Entrar com código">
          <p className="mb-4 text-sm text-muted">
            Recebeu um código? Digite aqui e caia direto no ranking do grupo.
          </p>
          <EntrarGrupoForm />
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Meus grupos
        </h2>
        {grupos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grupos.map((g) => {
              const p = posicoes.get(g.id);
              return (
                <Link
                  key={g.id}
                  href={`/painel/bolao/grupo/${g.codigo}`}
                  className="glass glass-hover block p-5 transition hover:border-brand/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-display text-base font-semibold">{g.nome}</h3>
                    {g.donoId === sessao.uid && (
                      <span title="Você é o dono do grupo">
                        <Crown className="h-4 w-4 shrink-0 text-gold" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" /> {g.membros}
                    </span>
                    {p && (
                      <span className="inline-flex items-center gap-1.5">
                        <Dices className="h-4 w-4" /> {p.pos}º · {p.pontos} pts
                      </span>
                    )}
                    <span className="ml-auto font-mono text-xs tracking-widest">{g.codigo}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Você ainda não está em nenhum grupo — crie um acima ou entre com um código. 🎉
          </p>
        )}
      </section>
    </>
  );
}
