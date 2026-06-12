"use client";

import { useEffect, useState } from "react";
import type { LiveMatch } from "@/lib/worldcup/live";

/**
 * O coração da landing: um painel eletrônico de verdade.
 * - Jogo ao vivo: placar + relógio, atualizando via /api/live a cada 30s.
 * - Próximo jogo: contagem regressiva tique-taqueando no estilo letreiro.
 */

export type JogoHero = {
  mandante: string;
  visitante: string;
  flagMandante: string;
  flagVisitante: string;
  fifaMandante?: string;
  fifaVisitante?: string;
  kickoffISO?: string;
  placarMandante?: number;
  placarVisitante?: number;
  status: "agendado" | "ao-vivo" | "encerrado";
  fase: string;
  estadio: string;
  cidade: string;
};

function paddear(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

function Contagem({ kickoffISO }: { kickoffISO: string }) {
  const [restam, setRestam] = useState<number | null>(null);
  useEffect(() => {
    const calc = () => setRestam(Date.parse(kickoffISO) - Date.now());
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [kickoffISO]);

  if (restam === null) return <div className="h-16" aria-hidden />;
  const s = Math.floor(restam / 1000);
  const blocos: [string, string][] = [
    [paddear(Math.floor(s / 86400)), "dias"],
    [paddear(Math.floor((s % 86400) / 3600)), "horas"],
    [paddear(Math.floor((s % 3600) / 60)), "min"],
    [paddear(s % 60), "seg"],
  ];
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-4">
      {blocos.map(([v, rotulo], i) => (
        <div key={rotulo} className="flex items-end gap-3 sm:gap-4">
          {i > 0 && <span className="pb-5 font-mono text-2xl text-brand/50 sm:text-3xl">:</span>}
          <div className="text-center">
            <span className="block font-mono text-4xl font-bold tabular-nums text-brand [text-shadow:0_0_18px_rgba(255,179,0,0.45)] sm:text-6xl">
              {v}
            </span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-muted">
              {rotulo}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PainelHero({ jogo }: { jogo: JogoHero | null }) {
  const [vivo, setVivo] = useState<LiveMatch | null>(null);

  // jogo rolando: placar fresco a cada 30s
  useEffect(() => {
    if (jogo?.status !== "ao-vivo") return;
    let ativo = true;
    const buscar = async () => {
      try {
        const r = await fetch("/api/live");
        const lista = (await r.json()) as LiveMatch[];
        const meu = lista.find(
          (l) =>
            (l.mandante.fifa === jogo.fifaMandante && l.visitante.fifa === jogo.fifaVisitante) ||
            (l.mandante.fifa === jogo.fifaVisitante && l.visitante.fifa === jogo.fifaMandante),
        );
        if (ativo && meu) setVivo(meu);
      } catch {
        /* mantém o placar do servidor */
      }
    };
    buscar();
    const t = setInterval(buscar, 30_000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [jogo]);

  if (!jogo) return null;
  const aoVivo = jogo.status === "ao-vivo";
  const gM = vivo ? vivo.mandante.gols : (jogo.placarMandante ?? 0);
  const gV = vivo ? vivo.visitante.gols : (jogo.placarVisitante ?? 0);

  const horaLocal = jogo.kickoffISO
    ? new Date(jogo.kickoffISO).toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "";

  return (
    <div className="relative rounded-3xl border border-brand/30 bg-background/90 p-6 shadow-[inset_0_0_60px_rgba(255,179,0,0.05),0_30px_80px_-40px_rgba(255,179,0,0.25)] sm:p-8">
      {/* cabeçalho do letreiro */}
      <div className="mb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-muted">
        <span>{jogo.fase}</span>
        {aoVivo ? (
          <span className="flex items-center gap-2 font-semibold text-danger">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" /> Ao vivo
            {vivo?.detalhe && <span className="text-muted">· {vivo.detalhe}</span>}
          </span>
        ) : (
          <span className="text-brand">Próximo jogo</span>
        )}
      </div>

      {/* os dois lados */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <span className="text-6xl sm:text-7xl">{jogo.flagMandante}</span>
          <span className="font-display text-sm font-bold uppercase tracking-wide sm:text-base">
            {jogo.mandante}
          </span>
        </div>

        <div className="shrink-0 px-2 text-center">
          {aoVivo ? (
            <span className="font-mono text-6xl font-bold tabular-nums text-brand [text-shadow:0_0_24px_rgba(255,179,0,0.5)] sm:text-7xl">
              {gM}
              <span className="px-2 text-muted/60">×</span>
              {gV}
            </span>
          ) : (
            <span className="font-mono text-4xl font-bold text-muted/50 sm:text-5xl">×</span>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <span className="text-6xl sm:text-7xl">{jogo.flagVisitante}</span>
          <span className="font-display text-sm font-bold uppercase tracking-wide sm:text-base">
            {jogo.visitante}
          </span>
        </div>
      </div>

      {/* contagem ou rodapé */}
      {!aoVivo && jogo.kickoffISO && (
        <div className="mt-8">
          <Contagem kickoffISO={jogo.kickoffISO} />
        </div>
      )}
      <p className="mt-6 text-center text-xs text-muted">
        {horaLocal && <span className="font-medium text-foreground/80">{horaLocal} (Brasília)</span>}
        {" · "}
        {jogo.estadio} · {jogo.cidade}
      </p>
    </div>
  );
}
