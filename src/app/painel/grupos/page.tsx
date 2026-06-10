import { PageHeader } from "@/components/ui/page-header";
import { getStandings } from "@/lib/worldcup";

export default async function GruposPage() {
  const standings = await getStandings();
  const grupos = Object.keys(standings).sort();
  const algumJogo = Object.values(standings)
    .flat()
    .some((l) => l.jogos > 0);

  return (
    <>
      <PageHeader
        titulo="Grupos"
        descricao={
          algumJogo
            ? "Classificação atualizada dos 12 grupos."
            : "Os 12 grupos do sorteio. A classificação é calculada automaticamente conforme os jogos acontecem."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {grupos.map((g) => (
          <div key={g} className="glass p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg btn-brand font-display text-sm font-bold">
                {g}
              </span>
              <span className="text-sm font-semibold">Grupo {g}</span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-medium">Seleção</th>
                  <th className="pb-2 text-center font-medium">P</th>
                  <th className="pb-2 text-center font-medium">J</th>
                  <th className="pb-2 text-center font-medium">SG</th>
                </tr>
              </thead>
              <tbody>
                {standings[g].map((l, i) => (
                  <tr key={l.selecao} className="border-t border-border/50">
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${i < 2 ? "bg-brand" : "bg-surface-2"}`}
                        />
                        <span className="text-base">{l.flag}</span>
                        <span className="truncate font-medium">{l.selecao}</span>
                      </span>
                    </td>
                    <td className="py-2 text-center font-semibold text-brand">{l.pontos}</td>
                    <td className="py-2 text-center text-muted">{l.jogos}</td>
                    <td className="py-2 text-center">{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}
