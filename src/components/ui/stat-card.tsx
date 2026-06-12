import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Counter } from "@/components/motion/counter";

const accentMap: Record<string, string> = {
  brand: "bg-brand/10 text-brand",
  "brand-2": "bg-brand-2/10 text-brand-2",
  accent: "bg-accent/10 text-accent",
  violet: "bg-violet/10 text-violet",
  gold: "bg-gold/10 text-gold",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "brand",
  suffix,
  prefix,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "brand" | "brand-2" | "accent" | "violet" | "gold";
  suffix?: string;
  prefix?: string;
  /** Torna o card clicável, levando à tela com o detalhe da métrica. */
  href?: string;
}) {
  const card = (
    <div className={`glass glass-hover group p-5 ${href ? "transition hover:border-brand/40" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight">
            {typeof value === "number" ? (
              <Counter value={value} prefix={prefix} suffix={suffix} />
            ) : (
              value
            )}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
        </div>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition group-hover:scale-110 ${accentMap[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );

  if (!href) return card;
  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}
