import { headers } from "next/headers";

/**
 * Rate limit em memória por IP (janela deslizante). Melhor esforço em
 * serverless: o Fluid Compute reusa instâncias, então segura brute force
 * básico sem precisar de Redis.
 */

const tentativas = new Map<string, number[]>();

function limpar(agora: number) {
  if (tentativas.size < 5000) return;
  for (const [k, lista] of tentativas) {
    if (lista.every((t) => agora - t > 3_600_000)) tentativas.delete(k);
  }
}

export async function rateLimit(
  acao: string,
  maxTentativas: number,
  janelaMin: number,
): Promise<string | null> {
  const h = await headers();
  const ip =
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const chave = `${acao}:${ip}`;
  const agora = Date.now();
  const janelaMs = janelaMin * 60_000;

  const lista = (tentativas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (lista.length >= maxTentativas) {
    return `Muitas tentativas. Aguarde uns minutos e tente de novo.`;
  }
  lista.push(agora);
  tentativas.set(chave, lista);
  limpar(agora);
  return null;
}
