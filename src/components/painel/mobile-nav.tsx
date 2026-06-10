"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/painel"
            ? pathname === "/painel"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs transition ${
              active
                ? "border-brand/40 bg-brand/10 text-brand"
                : "border-border bg-surface/40 text-muted"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
