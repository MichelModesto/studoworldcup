"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LiveMatch } from "@/lib/worldcup/live";
import { DigitoPlacar, TagAoVivo } from "./placar-fx";

const FUSO = "America/Sao_Paulo";

function horarioBR(iso: string) {
  const d = new Date(iso);
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: FUSO });
  const dia = d.toLocaleDateString("en-CA", { timeZone: FUSO });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  });
  if (dia === hoje) return `Hoje · ${hora}`;
  const data = d.toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
  });
  return `${data} · ${hora}`;
}

function Badge({ jogo }: { jogo: LiveMatch }) {
  if (jogo.estado === "in")
    return <TagAoVivo texto={`AO VIVO${jogo.relogio ? ` · ${jogo.relogio}` : ""}`} />;
  if (jogo.estado === "post")
    return (
      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-muted">
        Encerrado
      </span>
    );
  return (
    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
      {horarioBR(jogo.inicioISO)}
    </span>
  );
}

export function LiveScores({ initial }: { initial: LiveMatch[] }) {
  const [jogos, setJogos] = useState(initial);

  useEffect(() => {
    if (!jogos.length) return;
    // 30s com jogo rolando; 5 min se só há agendados/encerrados.
    const aoVivo = jogos.some((j) => j.estado === "in");
    const intervalo = setInterval(
      async () => {
        try {
          const res = await fetch("/api/live", { cache: "no-store" });
          if (res.ok) setJogos(await res.json());
        } catch {
          /* mantém o placar atual em falha transitória */
        }
      },
      aoVivo ? 30_000 : 300_000,
    );
    return () => clearInterval(intervalo);
  }, [jogos]);

  if (!jogos.length) return null;

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {jogos.map((j) => {
        const comPlacar = j.estado !== "pre";
        return (
          <Link
            key={j.id}
            href={`/painel/confronto/${j.mandante.fifa}-${j.visitante.fifa}`}
            title="Comparar as duas seleções"
            className="glass glass-hover flex items-center justify-between gap-3 p-4 transition hover:border-brand/40"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              {[j.mandante, j.visitante].map((s) => (
                <div key={s.fifa} className="flex items-center gap-2 text-sm">
                  <span className="text-lg leading-none">{s.flag}</span>
                  <span className="truncate font-medium">{s.nome}</span>
                  {comPlacar && (
                    <DigitoPlacar
                      valor={s.gols}
                      className="ml-auto font-mono text-base font-bold"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="shrink-0 text-right">
              <Badge jogo={j} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
