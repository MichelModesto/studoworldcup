import type { LucideIcon } from "lucide-react";
import { MarcaS } from "@/components/brand";

export function EmptyState({
  icon: Icon,
  titulo,
  descricao,
}: {
  icon?: LucideIcon;
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className="glass relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* marca apagada ao fundo, como letreiro desligado */}
      <MarcaS className="pointer-events-none absolute -right-4 -top-6 h-40 w-auto text-foreground/[0.04]" />
      {Icon ? (
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Icon className="h-7 w-7" />
        </span>
      ) : (
        <MarcaS className="h-12 w-auto text-muted/40" />
      )}
      <h3 className="mt-4 text-lg font-semibold">{titulo}</h3>
      {descricao && <p className="mt-2 max-w-md text-sm text-muted">{descricao}</p>}
    </div>
  );
}
