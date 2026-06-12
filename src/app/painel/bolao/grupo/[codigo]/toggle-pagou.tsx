"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { marcarPagamentoAction, type BolaoState } from "../../actions";

function Botao({ pagou }: { pagou: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={pagou ? "Desmarcar pagamento" : "Marcar como pago"}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition disabled:opacity-60 ${
        pagou
          ? "bg-success/15 text-success hover:bg-success/25"
          : "bg-surface-2 text-muted hover:bg-danger/10 hover:text-danger"
      }`}
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : pagou ? "💰 pago" : "pendente"}
    </button>
  );
}

/** Toggle de pagamento — só o dono do grupo vê (a action revalida no servidor). */
export function TogglePagou({
  grupoId,
  usuarioId,
  pagou,
}: {
  grupoId: number;
  usuarioId: number;
  pagou: boolean;
}) {
  const [, action] = useActionState<BolaoState, FormData>(marcarPagamentoAction, {});
  return (
    <form action={action} className="inline">
      <input type="hidden" name="grupoId" value={grupoId} />
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="pagou" value={String(!pagou)} />
      <Botao pagou={pagou} />
    </form>
  );
}
