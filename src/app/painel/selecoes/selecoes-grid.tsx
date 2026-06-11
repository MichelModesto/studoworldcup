"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Team } from "@/lib/worldcup/types";

const confColors: Record<string, string> = {
  UEFA: "bg-brand-2/15 text-brand-2",
  CONMEBOL: "bg-brand/15 text-brand",
  CONCACAF: "bg-gold/15 text-gold",
  CAF: "bg-accent/15 text-accent",
  AFC: "bg-violet/15 text-violet",
  OFC: "bg-surface-2 text-muted",
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function SelecoesGrid({ teams }: { teams: Team[] }) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const q = norm(busca.trim());
    if (!q) return teams;
    return teams.filter((t) =>
      [t.nomePt, t.name, t.fifa, t.confed, `grupo ${t.group}`, t.group].some((campo) =>
        norm(campo).includes(q),
      ),
    );
  }, [teams, busca]);

  return (
    <>
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar seleção, código FIFA, grupo ou confederação..."
          aria-label="Buscar seleção"
          className="w-full rounded-xl border border-border bg-surface/60 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-brand/60"
        />
      </div>

      {filtradas.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtradas.map((s) => (
            <Link
              key={s.fifa}
              href={`/painel/selecoes/${s.fifa.toLowerCase()}`}
              className="glass glass-hover group block p-5"
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl transition group-hover:scale-110">{s.flag}</span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted">
                  {s.fifa}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold transition group-hover:text-brand">
                {s.nomePt}
              </h3>
              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${confColors[s.confed]}`}
                >
                  {s.confed}
                </span>
                <span className="text-xs text-muted">Grupo {s.group}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Nenhuma seleção encontrada para “{busca}”. Tente o nome, o código FIFA (ex.: BRA) ou a
          confederação.
        </p>
      )}
    </>
  );
}
