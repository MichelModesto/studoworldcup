import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getGroups, getMatches } from "@/lib/worldcup";
import { SimuladorGrupos, type JogoSim } from "./simulador";

export default async function SimuladorPage() {
  const [groups, matches] = await Promise.all([getGroups(), getMatches()]);

  const grupos = groups.map(({ grupo, times }) => {
    const jogos: JogoSim[] = matches
      .filter((m) => m.fase === "Fase de Grupos" && m.grupo === grupo)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((m) => ({
        id: m.id,
        grupo,
        mandante: m.mandante,
        visitante: m.visitante,
        flagMandante: m.flagMandante,
        flagVisitante: m.flagVisitante,
        real:
          m.status === "encerrado" && m.placarMandante !== undefined
            ? ([m.placarMandante, m.placarVisitante ?? 0] as [number, number])
            : null,
      }));
    return {
      grupo,
      times: times.map((t) => ({ nome: t.nomePt, flag: t.flag })),
      jogos,
    };
  });

  return (
    <>
      <Link
        href="/painel/grupos"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Grupos
      </Link>
      <PageHeader
        titulo="Simulador e se...?"
        descricao="Preencha placares dos jogos restantes e veja a classificação recalcular na hora. Resultados reais já entram travados; nada é salvo."
      />
      <SimuladorGrupos grupos={grupos} />
    </>
  );
}
