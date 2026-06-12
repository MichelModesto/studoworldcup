import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/painel/sidebar";
import { Topbar } from "@/components/painel/topbar";
import { PageTransition } from "@/components/painel/page-transition";
import { RegistrarSW } from "@/components/painel/lembretes";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await getSession();
  if (!sessao) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1">
      <RegistrarSW />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar nome={sessao.nome} />
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
