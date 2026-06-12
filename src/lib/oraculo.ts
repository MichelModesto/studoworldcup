import { randomBytes } from "node:crypto";
import { sql } from "./db";
import { hashSenha } from "./auth";
import { getMatches } from "./worldcup";
import { getTeamStats } from "./worldcup/team-stats";

/**
 * 🔮 Oráculo — bot do bolão. Entra em todos os grupos e palpita usando as
 * estatísticas reais do site (média de gols marcados/sofridos desde 2023,
 * modelo Poisson simplificado). A graça é a galera tentar bater a IA.
 */

export const ORACULO_NOME = "🔮 Oráculo";
export const ORACULO_EMAIL = "oraculo@studoworldcup.ia";

let oraculoId: number | null = null;
let ultimaRodada = 0;

async function getOraculoId(): Promise<number> {
  if (oraculoId) return oraculoId;
  const achar = (await sql()`
    SELECT id FROM usuarios WHERE email = ${ORACULO_EMAIL}
  `) as { id: number }[];
  if (achar[0]) return (oraculoId = achar[0].id);
  // senha aleatória nunca divulgada: ninguém loga como o Oráculo
  const criado = (await sql()`
    INSERT INTO usuarios (nome, email, senha_hash)
    VALUES (${ORACULO_NOME}, ${ORACULO_EMAIL}, ${hashSenha(randomBytes(32).toString("hex"))})
    ON CONFLICT (email) DO UPDATE SET nome = ${ORACULO_NOME}
    RETURNING id
  `) as { id: number }[];
  return (oraculoId = criado[0].id);
}

/** Placar previsto via gols esperados (ataque × defesa do rival). */
function preverPlacar(
  lambdaA: number,
  lambdaB: number,
): { golsA: number; golsB: number } {
  const arredondar = (l: number) => Math.max(0, Math.min(4, Math.round(l)));
  let golsA = arredondar(lambdaA);
  let golsB = arredondar(lambdaB);
  // diferença pequena de força -> o Oráculo prevê empate
  if (golsA !== golsB && Math.abs(lambdaA - lambdaB) < 0.25) {
    const m = Math.max(0, Math.min(4, Math.round((lambdaA + lambdaB) / 2)));
    golsA = m;
    golsB = m;
  }
  return { golsA, golsB };
}

/**
 * Garante o Oráculo em todos os grupos e com palpite em todos os jogos
 * futuros. Idempotente e barato; roda no máximo a cada 10 min por instância.
 */
export async function atualizarOraculo(): Promise<void> {
  const agora = Date.now();
  if (agora - ultimaRodada < 10 * 60_000) return;
  ultimaRodada = agora;

  const oid = await getOraculoId();

  // entra em todo grupo existente (novos inclusos a cada rodada)
  await sql()`
    INSERT INTO grupo_membros (grupo_id, usuario_id)
    SELECT id, ${oid} FROM grupos
    ON CONFLICT DO NOTHING
  `;

  const [matches, existentesRaw] = await Promise.all([
    getMatches(),
    sql()`SELECT match_id FROM palpites WHERE usuario_id = ${oid}`,
  ]);
  const existentes = existentesRaw as { match_id: number }[];
  const ja = new Set(existentes.map((r) => r.match_id));
  const futuros = matches.filter(
    (m) =>
      !ja.has(m.id) &&
      m.fifaMandante &&
      m.fifaVisitante &&
      m.kickoffISO &&
      Date.parse(m.kickoffISO) > agora,
  );
  if (!futuros.length) return;

  const statsCache = new Map<string, { atk: number; def: number }>();
  const forca = async (fifa: string) => {
    const cache = statsCache.get(fifa);
    if (cache) return cache;
    const s = await getTeamStats(fifa);
    const f = {
      atk: s?.porJogo.golsPro ?? 1.2,
      def: s?.porJogo.golsContra ?? 1.2,
    };
    statsCache.set(fifa, f);
    return f;
  };

  for (const m of futuros) {
    const a = await forca(m.fifaMandante!);
    const b = await forca(m.fifaVisitante!);
    const { golsA, golsB } = preverPlacar((a.atk + b.def) / 2, (b.atk + a.def) / 2);
    await sql()`
      INSERT INTO palpites (usuario_id, match_id, gols_mandante, gols_visitante)
      VALUES (${oid}, ${m.id}, ${golsA}, ${golsB})
      ON CONFLICT (usuario_id, match_id) DO NOTHING
    `;
  }
}
