import { Clock, MapPin } from "lucide-react";
import type { Match } from "@/lib/worldcup";

const statusInfo: Record<Match["status"], { label: string; cls: string }> = {
  encerrado: { label: "Encerrado", cls: "bg-surface-2 text-muted" },
  "ao-vivo": { label: "Ao vivo", cls: "bg-danger/15 text-danger" },
  agendado: { label: "Agendado", cls: "bg-brand/10 text-brand" },
};

const FUSO = "America/Sao_Paulo";

function formatarData(jogo: Match) {
  const base = jogo.kickoffISO ?? `${jogo.dataISO}T00:00:00`;
  return new Date(base).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: FUSO,
  });
}

function formatarHora(jogo: Match): string | null {
  if (!jogo.kickoffISO) return null;
  return new Date(jogo.kickoffISO).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
  });
}

export function MatchCard({ jogo }: { jogo: Match }) {
  const s = statusInfo[jogo.status];
  const temPlacar = jogo.placarMandante !== undefined;
  const hora = formatarHora(jogo);

  return (
    <div className="glass glass-hover p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="truncate">
          {jogo.fase}
          {jogo.grupo ? ` · Grupo ${jogo.grupo}` : ""}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${s.cls}`}
        >
          {jogo.status === "ao-vivo" && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
          )}
          {s.label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-2xl">{jogo.flagMandante}</span>
          <span className="truncate text-sm font-medium">{jogo.mandante}</span>
        </div>

        <div className="shrink-0 text-center">
          {temPlacar ? (
            <span className="font-display text-xl font-bold tabular-nums">
              {jogo.placarMandante} <span className="text-muted">×</span>{" "}
              {jogo.placarVisitante}
            </span>
          ) : (
            <div className="leading-tight">
              <span className="block text-xs text-muted">{formatarData(jogo)}</span>
              {hora && (
                <span className="mt-0.5 inline-flex items-center gap-1 font-display text-sm font-semibold text-brand tabular-nums">
                  <Clock className="h-3 w-3" />
                  {hora}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-medium">
            {jogo.visitante}
          </span>
          <span className="text-2xl">{jogo.flagVisitante}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {jogo.estadio} · {jogo.cidade}
        </span>
      </div>
    </div>
  );
}
