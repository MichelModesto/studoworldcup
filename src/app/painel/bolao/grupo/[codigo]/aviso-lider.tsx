"use client";

import { useEffect, useState } from "react";
import { Crown, X } from "lucide-react";
import { Confete } from "@/components/painel/placar-fx";
import { reconhecerLiderAction } from "../../actions";

const ZOEIRAS = [
  "Aproveita enquanto dura, campeão.",
  "Hoje a galera acorda te xingando. Bom dia! 😎",
  "Líder do dia. Amanhã a gente revê isso.",
  "Tá voando, hein? Não vai se acostumar não.",
  "O trono é seu… por enquanto. 👀",
  "Manda foto do palpite no grupo, sem vergonha.",
  "Topo da tabela combina com você. Segura aí.",
];

/**
 * Aviso comemorativo (uma vez por dia) para quem amanheceu na liderança do grupo.
 * Ao montar, dispara confete e marca como visto no servidor (não repete no mesmo dia).
 */
export function AvisoLider({
  nome,
  pontos,
  grupoId,
}: {
  nome: string;
  pontos: number;
  grupoId: number;
}) {
  const [visivel, setVisivel] = useState(true);
  const [disparo, setDisparo] = useState(0);
  // Determinístico (sem random no render/effect): varia por pontos, sem mismatch de hidratação.
  const zoeira = ZOEIRAS[(pontos + nome.length) % ZOEIRAS.length];

  useEffect(() => {
    const t = setTimeout(() => setDisparo(1), 150);
    void reconhecerLiderAction(grupoId);
    return () => clearTimeout(t);
  }, [grupoId]);

  if (!visivel) return null;

  return (
    <>
      <Confete disparo={disparo} />
      <div className="glass neon-border mb-6 flex items-start gap-4 border-gold/30 p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
          <Crown className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold tracking-tight">
            👑 {nome}, você amanheceu na <span className="text-gold">liderança</span>!
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {pontos} pts e em 1º lugar do bolão. {zoeira}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisivel(false)}
          aria-label="Fechar"
          className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
