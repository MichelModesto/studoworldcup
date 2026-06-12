import { PageHeader } from "@/components/ui/page-header";
import { getTeams } from "@/lib/worldcup";
import { SelecoesGrid } from "./selecoes-grid";

export const metadata = { title: "Seleções" };

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
      <SelecoesGrid teams={ordenadas} />
    </>
  );
}
