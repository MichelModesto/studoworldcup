import { randomInt } from "node:crypto";
import { sql } from "./db";
import { getMatches } from "./worldcup";
import type { Match } from "./worldcup/types";

/**
 * Bolão: grupos com código de convite, palpites por jogo e ranking.
 *
 * Pontuação:
 *  - placar exato  -> 3 pontos
 *  - acertou só o resultado (vencedor ou empate) -> 1 ponto
 *
 * O palpite é do usuário e vale em todos os grupos em que ele está.
 * Palpites travam no horário do pontapé inicial (kickoffISO).
 */

export type Grupo = {
  id: number;
  nome: string;
  codigo: string;
  donoId: number;
  membros: number;
};

export type Palpite = { golsMandante: number; golsVisitante: number };

export type LinhaRanking = {
  usuarioId: number;
  nome: string;
  pontos: number;
  exatos: number;
  resultados: number;
  palpites: number;
};

// Sem 0/O/1/I/L para o código ser fácil de ditar no grupo da família.
const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function gerarCodigo(): string {
  return Array.from({ length: 6 }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join(
    "",
  );
}

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ---------- jogos ----------

export function jaComecou(m: Match, agora = Date.now()): boolean {
  if (m.kickoffISO) return Date.parse(m.kickoffISO) <= agora;
  return m.status !== "agendado";
}

/** Pontos de um palpite num jogo: 3 exato, 1 resultado, 0 errou, null se não encerrou. */
export function pontosDoPalpite(p: Palpite, m: Match): number | null {
  if (m.status !== "encerrado" || m.placarMandante === undefined || m.placarVisitante === undefined)
    return null;
  if (p.golsMandante === m.placarMandante && p.golsVisitante === m.placarVisitante) return 3;
  const palpite = Math.sign(p.golsMandante - p.golsVisitante);
  const real = Math.sign(m.placarMandante - m.placarVisitante);
  return palpite === real ? 1 : 0;
}

// ---------- grupos ----------

export async function criarGrupo(uid: number, nome: string): Promise<Grupo | { erro: string }> {
  const nomeLimpo = nome.trim().replace(/\s+/g, " ");
  if (nomeLimpo.length < 2 || nomeLimpo.length > 40) {
    return { erro: "Nome do grupo deve ter entre 2 e 40 caracteres." };
  }
  // colisão de código é raríssima (31^6); tenta algumas vezes por garantia
  for (let i = 0; i < 5; i++) {
    const codigo = gerarCodigo();
    try {
      const rows = (await sql()`
        INSERT INTO grupos (nome, codigo, dono_id)
        VALUES (${nomeLimpo}, ${codigo}, ${uid})
        RETURNING id
      `) as { id: number }[];
      const id = rows[0].id;
      await sql()`INSERT INTO grupo_membros (grupo_id, usuario_id) VALUES (${id}, ${uid})`;
      return { id, nome: nomeLimpo, codigo, donoId: uid, membros: 1 };
    } catch (e) {
      if (e instanceof Error && e.message.includes("grupos_codigo_key")) continue;
      throw e;
    }
  }
  return { erro: "Não foi possível gerar um código de grupo. Tente de novo." };
}

export async function entrarNoGrupo(
  uid: number,
  codigo: string,
): Promise<Grupo | { erro: string }> {
  const cod = normalizarCodigo(codigo);
  if (cod.length !== 6) return { erro: "Código inválido — são 6 letras/números." };
  const rows = (await sql()`
    SELECT g.id, g.nome, g.codigo, g.dono_id,
           (SELECT count(*)::int FROM grupo_membros m WHERE m.grupo_id = g.id) AS membros
    FROM grupos g WHERE g.codigo = ${cod}
  `) as { id: number; nome: string; codigo: string; dono_id: number; membros: number }[];
  const g = rows[0];
  if (!g) return { erro: "Grupo não encontrado. Confira o código com quem te convidou." };
  await sql()`
    INSERT INTO grupo_membros (grupo_id, usuario_id)
    VALUES (${g.id}, ${uid})
    ON CONFLICT DO NOTHING
  `;
  return { id: g.id, nome: g.nome, codigo: g.codigo, donoId: g.dono_id, membros: g.membros };
}

export async function meusGrupos(uid: number): Promise<Grupo[]> {
  const rows = (await sql()`
    SELECT g.id, g.nome, g.codigo, g.dono_id,
           (SELECT count(*)::int FROM grupo_membros m2 WHERE m2.grupo_id = g.id) AS membros
    FROM grupos g
    JOIN grupo_membros m ON m.grupo_id = g.id AND m.usuario_id = ${uid}
    ORDER BY g.criado_em
  `) as { id: number; nome: string; codigo: string; dono_id: number; membros: number }[];
  return rows.map((g) => ({
    id: g.id,
    nome: g.nome,
    codigo: g.codigo,
    donoId: g.dono_id,
    membros: g.membros,
  }));
}

export async function getGrupoPorCodigo(codigo: string): Promise<Grupo | null> {
  const cod = normalizarCodigo(codigo);
  const rows = (await sql()`
    SELECT g.id, g.nome, g.codigo, g.dono_id,
           (SELECT count(*)::int FROM grupo_membros m WHERE m.grupo_id = g.id) AS membros
    FROM grupos g WHERE g.codigo = ${cod}
  `) as { id: number; nome: string; codigo: string; dono_id: number; membros: number }[];
  const g = rows[0];
  return g
    ? { id: g.id, nome: g.nome, codigo: g.codigo, donoId: g.dono_id, membros: g.membros }
    : null;
}

export async function ehMembro(grupoId: number, uid: number): Promise<boolean> {
  const rows = (await sql()`
    SELECT 1 FROM grupo_membros WHERE grupo_id = ${grupoId} AND usuario_id = ${uid}
  `) as unknown[];
  return rows.length > 0;
}

// ---------- palpites ----------

export async function salvarPalpite(
  uid: number,
  matchId: number,
  golsMandante: number,
  golsVisitante: number,
): Promise<string | null> {
  if (
    !Number.isInteger(golsMandante) ||
    !Number.isInteger(golsVisitante) ||
    golsMandante < 0 ||
    golsMandante > 20 ||
    golsVisitante < 0 ||
    golsVisitante > 20
  ) {
    return "Placar inválido (0 a 20 gols).";
  }
  const matches = await getMatches();
  const m = matches.find((x) => x.id === matchId);
  if (!m) return "Jogo não encontrado.";
  if (jaComecou(m)) return `Palpite fechado: ${m.mandante} × ${m.visitante} já começou.`;
  await sql()`
    INSERT INTO palpites (usuario_id, match_id, gols_mandante, gols_visitante, atualizado_em)
    VALUES (${uid}, ${matchId}, ${golsMandante}, ${golsVisitante}, now())
    ON CONFLICT (usuario_id, match_id)
    DO UPDATE SET gols_mandante = ${golsMandante}, gols_visitante = ${golsVisitante}, atualizado_em = now()
  `;
  return null;
}

export async function palpitesDoUsuario(uid: number): Promise<Map<number, Palpite>> {
  const rows = (await sql()`
    SELECT match_id, gols_mandante, gols_visitante FROM palpites WHERE usuario_id = ${uid}
  `) as { match_id: number; gols_mandante: number; gols_visitante: number }[];
  return new Map(
    rows.map((r) => [r.match_id, { golsMandante: r.gols_mandante, golsVisitante: r.gols_visitante }]),
  );
}

/** Palpites de todos os membros do grupo, agrupados por jogo. */
export async function palpitesDoGrupo(
  grupoId: number,
): Promise<Map<number, { usuarioId: number; nome: string; palpite: Palpite }[]>> {
  const rows = (await sql()`
    SELECT p.match_id, p.gols_mandante, p.gols_visitante, u.id AS usuario_id, u.nome
    FROM palpites p
    JOIN grupo_membros m ON m.usuario_id = p.usuario_id AND m.grupo_id = ${grupoId}
    JOIN usuarios u ON u.id = p.usuario_id
    ORDER BY u.nome
  `) as {
    match_id: number;
    gols_mandante: number;
    gols_visitante: number;
    usuario_id: number;
    nome: string;
  }[];
  const porJogo = new Map<number, { usuarioId: number; nome: string; palpite: Palpite }[]>();
  for (const r of rows) {
    const lista = porJogo.get(r.match_id) ?? [];
    lista.push({
      usuarioId: r.usuario_id,
      nome: r.nome,
      palpite: { golsMandante: r.gols_mandante, golsVisitante: r.gols_visitante },
    });
    porJogo.set(r.match_id, lista);
  }
  return porJogo;
}

// ---------- ranking ----------

export async function rankingDoGrupo(grupoId: number): Promise<LinhaRanking[]> {
  const [membrosRaw, porJogo, matches] = await Promise.all([
    sql()`
      SELECT u.id, u.nome FROM grupo_membros m JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.grupo_id = ${grupoId}
    `,
    palpitesDoGrupo(grupoId),
    getMatches(),
  ]);
  const membros = membrosRaw as { id: number; nome: string }[];
  const byId = new Map(matches.map((m) => [m.id, m]));

  const linhas = new Map<number, LinhaRanking>(
    membros.map((u) => [
      u.id,
      { usuarioId: u.id, nome: u.nome, pontos: 0, exatos: 0, resultados: 0, palpites: 0 },
    ]),
  );
  for (const [matchId, palpites] of porJogo) {
    const m = byId.get(matchId);
    if (!m) continue;
    for (const p of palpites) {
      const linha = linhas.get(p.usuarioId);
      if (!linha) continue;
      linha.palpites++;
      const pts = pontosDoPalpite(p.palpite, m);
      if (pts === null) continue;
      linha.pontos += pts;
      if (pts === 3) linha.exatos++;
      else if (pts === 1) linha.resultados++;
    }
  }
  return [...linhas.values()].sort(
    (a, b) =>
      b.pontos - a.pontos || b.exatos - a.exatos || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
