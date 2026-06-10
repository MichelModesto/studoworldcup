import { LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { Logo } from "@/components/brand";
import { MobileNav } from "./mobile-nav";

export function Topbar({ nome }: { nome: string }) {
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <div className="lg:hidden">
          <Logo href="/painel" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
              {iniciais}
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{nome}</p>
              <p className="text-xs text-muted">Sessão ativa</p>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-2 text-sm text-muted transition hover:border-danger/40 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>

      <div className="px-5 pb-3 lg:hidden">
        <MobileNav />
      </div>
    </header>
  );
}
