import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getTeams } from "@/lib/worldcup";

const confColors: Record<string, string> = {
  UEFA: "bg-brand-2/15 text-brand-2",
  CONMEBOL: "bg-brand/15 text-brand",
  CONCACAF: "bg-gold/15 text-gold",
  CAF: "bg-accent/15 text-accent",
  AFC: "bg-violet/15 text-violet",
  OFC: "bg-surface-2 text-muted",
};

export default async function SelecoesPage() {
  const teams = await getTeams();
  const ordenadas = [...teams].sort(
    (a, b) => a.group.localeCompare(b.group) || a.nomePt.localeCompare(b.nomePt),
  );

  return (
    <>
      <PageHeader
        titulo="Seleções"
        descricao={`As ${teams.length} seleções classificadas para a Copa do Mundo 2026.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ordenadas.map((s) => (
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
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${confColors[s.confed]}`}>
                {s.confed}
              </span>
              <span className="text-xs text-muted">Grupo {s.group}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
