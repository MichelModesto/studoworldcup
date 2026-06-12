"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

export type TimeSim = { nome: string; flag: string };
export type JogoSim = {
  id: number;
  grupo: string;
  mandante: string;
  visitante: string;
  flagMandante: string;
  flagVisitante: string;
  /** Placar real (jogo encerrado) ou null (simulável). */
  real: [number, number] | null;
};

type Linha = {
  nome: string;
  flag: string;
  pontos: number;
  jogos: number;
  saldo: number;
  golsPro: number;
};

const INPUT =
  "h-9 w-11 rounded-lg border border-border bg-surface/60 text-center font-display text-sm font-semibold outline-none transition focus:border-brand/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

function calcular(times: TimeSim[], jogos: JogoSim[], sim: Record<number, [string, string]>): Linha[] {
  const linhas = new Map<string, Linha>(
    times.map((t) => [t.nome, { nome: t.nome, flag: t.flag, pontos: 0, jogos: 0, saldo: 0, golsPro: 0 }]),
  );
  for (const j of jogos) {
    let ga: number | null = null;
    let gb: number | null = null;
    if (j.real) [ga, gb] = j.real;
    else {
      const s = sim[j.id];
      if (!s || s[0] === "" || s[1] === "") continue;
      ga = Number(s[0]);
      gb = Number(s[1]);
      if (!Number.isFinite(ga) || !Number.isFinite(gb)) continue;
    }
    const a = linhas.get(j.mandante);
    const b = linhas.get(j.visitante);
    if (!a || !b) continue;
    a.jogos++;
    b.jogos++;
    a.golsPro += ga;
    b.golsPro += gb;
    a.saldo += ga - gb;
    b.saldo += gb - ga;
    if (ga > gb) a.pontos += 3;
    else if (ga < gb) b.pontos += 3;
    else {
      a.pontos++;
      b.pontos++;
    }
  }
  return [...linhas.values()].sort(
    (x, y) => y.pontos - x.pontos || y.saldo - x.saldo || y.golsPro - x.golsPro || x.nome.localeCompare(y.nome),
  );
}

export function SimuladorGrupos({
  grupos,
}: {
  grupos: { grupo: string; times: TimeSim[]; jogos: JogoSim[] }[];
}) {
  const [sim, setSim] = useState<Record<number, [string, string]>>({});
  const temSimulacao = Object.values(sim).some((s) => s[0] !== "" && s[1] !== "");

  const tabelas = useMemo(
    () => grupos.map((g) => ({ grupo: g.grupo, linhas: calcular(g.times, g.jogos, sim) })),
    [grupos, sim],
  );

  const setGol = (id: number, lado: 0 | 1, valor: string) => {
    setSim((prev) => {
      const atual: [string, string] = prev[id] ? [...prev[id]] : ["", ""];
      atual[lado] = valor;
      return { ...prev, [id]: atual };
    });
  };

  return (
    <>
      {temSimulacao && (
        <button
          type="button"
          onClick={() => setSim({})}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm text-muted transition hover:border-danger/40 hover:text-danger"
        >
          <RotateCcw className="h-4 w-4" /> Limpar simulação
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {grupos.map((g, gi) => {
          const tabela = tabelas[gi].linhas;
          const simulaveis = g.jogos.filter((j) => !j.real);
          return (
            <div key={g.grupo} className="glass p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg btn-brand font-display text-sm font-bold">
                  {g.grupo}
                </span>
                <span className="text-sm font-semibold">Grupo {g.grupo}</span>
              </div>

              <table className="mb-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="pb-2 font-medium">Seleção</th>
                    <th className="pb-2 text-center font-medium">P</th>
                    <th className="pb-2 text-center font-medium">J</th>
                    <th className="pb-2 text-center font-medium">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {tabela.map((l, i) => (
                    <tr key={l.nome} className="border-t border-border/50">
                      <td className="py-1.5">
                        <span className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${i < 2 ? "bg-brand" : "bg-surface-2"}`} />
                          <span>{l.flag}</span>
                          <span className="truncate font-medium">{l.nome}</span>
                        </span>
                      </td>
                      <td className="py-1.5 text-center font-semibold text-brand">{l.pontos}</td>
                      <td className="py-1.5 text-center text-muted">{l.jogos}</td>
                      <td className="py-1.5 text-center">{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {simulaveis.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-3">
                  {simulaveis.map((j) => (
                    <div key={j.id} className="flex items-center justify-center gap-2 text-sm">
                      <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                        <span className="truncate text-xs">{j.mandante}</span>
                        <span>{j.flagMandante}</span>
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        inputMode="numeric"
                        value={sim[j.id]?.[0] ?? ""}
                        onChange={(e) => setGol(j.id, 0, e.target.value)}
                        placeholder="–"
                        aria-label={`Gols de ${j.mandante}`}
                        className={INPUT}
                      />
                      <span className="text-muted">×</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        inputMode="numeric"
                        value={sim[j.id]?.[1] ?? ""}
                        onChange={(e) => setGol(j.id, 1, e.target.value)}
                        placeholder="–"
                        aria-label={`Gols de ${j.visitante}`}
                        className={INPUT}
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span>{j.flagVisitante}</span>
                        <span className="truncate text-xs">{j.visitante}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
