import Link from "next/link";
import { AlarmClock, TrendingUp } from "lucide-react";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import { getAvisos } from "@/lib/bolao";
import { GerarCodigoRecuperacao } from "./gerar-codigo";

const FUSO = "America/Sao_Paulo";

function horaSP(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
  });
}

const POS_EMOJI = ["🥇", "🥈", "🥉"];

/**
 * Avisos do bolão ao logar: jogos fechando sem palpite, resumo de ontem
 * e pendência de código de recuperação. Renderiza nada se estiver tudo ok.
 */
export async function AvisosBolao() {
  if (!temBanco()) return null;
  const sessao = await getSession();
  if (!sessao || sessao.uid <= 0) return null;

  const avisos = await getAvisos(sessao.uid).catch(() => null);
  if (!avisos) return null;

  const algo =
    avisos.semPalpite > 0 || avisos.ontem || !avisos.temRecuperacao;
  if (!algo) return null;

  return (
    <div className="mb-6">
      {avisos.semPalpite > 0 && (
        <Link
          href="/painel/bolao/palpites"
          className="glass glass-hover mb-4 flex flex-wrap items-center justify-between gap-3 border border-danger/30 p-4 transition hover:border-danger/60"
        >
          <p className="flex items-center gap-2.5 text-sm">
            <AlarmClock className="h-5 w-5 shrink-0 animate-pulse text-danger" />
            <span>
              <strong>
                {avisos.semPalpite} jogo{avisos.semPalpite > 1 ? "s" : ""} nas próximas 24h sem
                palpite
              </strong>
              {avisos.primeiroFecha && (
                <span className="text-muted">
                  {" "}
                  — o primeiro fecha às {horaSP(avisos.primeiroFecha)}!
                </span>
              )}
            </span>
          </p>
          <span className="btn-brand shrink-0 rounded-xl px-4 py-2 text-sm font-medium">
            Palpitar agora →
          </span>
        </Link>
      )}

      {avisos.ontem && (
        <div className="glass mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm">
          <p className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 shrink-0 text-brand" />
            <span>
              Ontem: <strong className="text-brand">{avisos.ontem.pontos} pts</strong>
              {avisos.ontem.exatos > 0 && (
                <span className="text-gold">
                  {" "}
                  ({avisos.ontem.exatos} placar{avisos.ontem.exatos > 1 ? "es" : ""} exato
                  {avisos.ontem.exatos > 1 ? "s" : ""}! 🎯)
                </span>
              )}{" "}
              em {avisos.ontem.jogos} jogo{avisos.ontem.jogos > 1 ? "s" : ""}.
            </span>
          </p>
          {avisos.posicoes.map((p) => (
            <Link
              key={p.codigo}
              href={`/painel/bolao/grupo/${p.codigo}`}
              className="text-muted transition hover:text-foreground"
            >
              {POS_EMOJI[p.pos - 1] ?? `${p.pos}º`} de {p.total} no <strong>{p.nome}</strong> (
              {p.pontos} pts)
            </Link>
          ))}
        </div>
      )}

      {!avisos.temRecuperacao && <GerarCodigoRecuperacao />}
    </div>
  );
}
