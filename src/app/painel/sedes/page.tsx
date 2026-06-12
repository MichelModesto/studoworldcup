import { Building2, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getStadiums } from "@/lib/worldcup";

export const metadata = { title: "Sedes" };

const paisCor: Record<string, string> = {
  "Estados Unidos": "bg-brand-2/15 text-brand-2",
  Canadá: "bg-accent/15 text-accent",
  México: "bg-brand/15 text-brand",
};

function destaqueSede(estadio: string): string | undefined {
  if (/azteca/i.test(estadio)) return "Abertura";
  if (/metlife/i.test(estadio)) return "Final";
  return undefined;
}

export default async function SedesPage() {
  const stadiums = await getStadiums();
  const ordenados = [...stadiums].sort((a, b) => b.capacidade - a.capacidade);
  const totalCapacidade = stadiums.reduce((a, c) => a + c.capacidade, 0);
  const maior = ordenados[0];

  return (
    <>
      <PageHeader
        titulo="Sedes"
        descricao={`As ${stadiums.length} cidades anfitriãs em 3 países e seus estádios.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Estádios" value={stadiums.length} hint="EUA · Canadá · México" icon={MapPin} accent="brand" />
        <StatCard
          label="Maior estádio"
          value={maior?.estadio ?? "—"}
          hint={maior ? `${maior.capacidade.toLocaleString("pt-BR")} lugares` : ""}
          icon={Building2}
          accent="gold"
        />
        <StatCard label="Capacidade total" value={totalCapacidade} hint="Somando os estádios" icon={Users} accent="brand-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ordenados.map((c) => {
          const destaque = destaqueSede(c.estadio);
          return (
            <div key={c.estadio} className="glass glass-hover p-5">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paisCor[c.pais] ?? "bg-surface-2 text-muted"}`}>
                  {c.pais}
                </span>
                {destaque && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">
                    {destaque}
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{c.cidade}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Building2 className="h-3.5 w-3.5 shrink-0" /> {c.estadio}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-sm">
                <span className="text-brand">{c.capacidade.toLocaleString("pt-BR")} lugares</span>
                <span className="text-muted">{c.timezone}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
