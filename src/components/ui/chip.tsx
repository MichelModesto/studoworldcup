/** Chip/badge padronizado da identidade — uma cor, um significado. */
const CORES = {
  brand: "bg-brand/15 text-brand",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  gold: "bg-gold/15 text-gold",
  violet: "bg-violet/15 text-violet",
  neutro: "bg-surface-2 text-muted",
} as const;

export function Chip({
  cor = "neutro",
  title,
  className = "",
  children,
}: {
  cor?: keyof typeof CORES;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES[cor]} ${className}`}
    >
      {children}
    </span>
  );
}
