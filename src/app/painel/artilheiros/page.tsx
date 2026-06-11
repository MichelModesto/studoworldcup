import { Target } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/painel/player-avatar";
import { getScorers } from "@/lib/worldcup";

export default async function ArtilheirosPage() {
  const scorers = await getScorers(30);
  const max = Math.max(1, ...scorers.map((a) => a.gols));

  return (
    <>
      <PageHeader
        titulo="Artilheiros"
        descricao="Ranking de goleadores da Copa 2026 (atualizado a cada jogo)."
      />

      {scorers.length ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-3 pl-1">#</th>
                  <th className="pb-3">Jogador</th>
                  <th className="pb-3">Seleção</th>
                  <th className="pb-3 text-center">Pênaltis</th>
                  <th className="pb-3">Gols</th>
                </tr>
              </thead>
              <tbody>
                {scorers.map((a, i) => (
                  <tr key={`${a.jogador}-${a.selecao}`} className="border-t border-border/60">
                    <td className="py-3 pl-1">
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-md text-xs font-semibold ${
                          i === 0 ? "bg-gold/20 text-gold" : i < 3 ? "bg-brand/15 text-brand" : "bg-surface-2 text-muted"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 font-medium">
                      <span className="flex items-center gap-2.5">
                        <PlayerAvatar nome={a.jogador} foto={a.foto} size={30} />
                        {a.jogador}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="flex items-center gap-2 text-muted">
                        <span className="text-lg">{a.flag}</span>
                        {a.selecao}
                      </span>
                    </td>
                    <td className="py-3 text-center text-muted">{a.penaltis}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full btn-brand" style={{ width: `${(a.gols / max) * 100}%` }} />
                        </div>
                        <span className="w-5 font-semibold tabular-nums">{a.gols}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Target}
          titulo="Ranking de artilheiros em breve"
          descricao="O torneio começa em 11/06/2026. Assim que a bola rolar, os gols e seus autores aparecem aqui automaticamente — sem precisar mexer no código."
        />
      )}
    </>
  );
}
