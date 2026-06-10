import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  titulo,
  descricao,
}: {
  icon: LucideIcon;
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className="glass flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{titulo}</h3>
      {descricao && <p className="mt-2 max-w-md text-sm text-muted">{descricao}</p>}
    </div>
  );
}
