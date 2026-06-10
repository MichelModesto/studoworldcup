"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand";
import { NAV_ITEMS } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-surface/30 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Logo href="/painel" />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/painel"
              ? pathname === "/painel"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-brand/10 font-medium text-brand"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border bg-surface/40 p-4 text-xs text-muted">
        <p className="font-medium text-foreground">Copa do Mundo 2026</p>
        <p className="mt-1">México · Canadá · EUA</p>
      </div>
    </aside>
  );
}
