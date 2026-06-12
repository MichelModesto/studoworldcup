"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dices, LayoutDashboard, Swords, Users } from "lucide-react";

const ITENS = [
  { href: "/painel", label: "Visão", icon: LayoutDashboard },
  { href: "/painel/bolao", label: "Bolão", icon: Dices },
  { href: "/painel/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/painel/mata-mata", label: "Mata-mata", icon: Swords },
  { href: "/painel/selecoes", label: "Seleções", icon: Users },
];

/** Navegação inferior fixa no celular — bolão é uso de sofá. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITENS.map((item) => {
          const ativo =
            item.href === "/painel" ? pathname === "/painel" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                ativo ? "text-brand" : "text-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              <span
                className={`h-0.5 w-8 rounded-full transition ${ativo ? "bg-brand" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
