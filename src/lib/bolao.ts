import { randomInt } from "node:crypto";
import { sql } from "./db";
import { temCodigoRecuperacao } from "./auth";
import { getMatches, getScorers } from "./worldcup";
import { chaveNome } from "./worldcup/squads";
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
  /** Pontos de bônus (campeão/artilheiro), já somados em `pontos`. */
  bonus: number;
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

// ---------- palpites bônus (campeão 10 pts · artilheiro 5 pts) ----------

export const PONTOS_CAMPEAO = 10;
export const PONTOS_ARTILHEIRO = 5;

export type Bonus = { campeaoFifa: string | null; artilheiro: string | null };

/** Bônus travam quando o mata-mata começa (primeiro jogo fora da fase de grupos). */
export function bonusTravado(matches: Match[], agora = Date.now()): boolean {
  const mataMata = matches
    .filter((m) => m.fase !== "Fase de Grupos" && m.kickoffISO)
    .sort((a, b) => a.kickoffISO!.localeCompare(b.kickoffISO!));
  const primeiro = mataMata[0];
  if (!primeiro) return false;
  return Date.parse(primeiro.kickoffISO!) <= agora;
}

export async function getBonus(uid: number): Promise<Bonus> {
  const rows = (await sql()`
    SELECT campeao_fifa, artilheiro FROM palpites_bonus WHERE usuario_id = ${uid}
  `) as { campeao_fifa: string | null; artilheiro: string | null }[];
  return {
    campeaoFifa: rows[0]?.campeao_fifa ?? null,
    artilheiro: rows[0]?.artilheiro ?? null,
  };
}

export async function salvarBonus(
  uid: number,
  campeaoFifa: string,
  artilheiro: string,
): Promise<string | null> {
  const matches = await getMatches();
  if (bonusTravado(matches)) {
    return "Palpites bônus fecharam no início do mata-mata.";
  }
  const fifa = campeaoFifa.trim().toUpperCase();
  const art = artilheiro.trim().replace(/\s+/g, " ").slice(0, 60);
  if (fifa && !/^[A-Z]{3}$/.test(fifa)) return "Seleção campeã inválida.";
  if (!fifa && !art) return "Escolha pelo menos um palpite bônus.";
  await sql()`
    INSERT INTO palpites_bonus (usuario_id, campeao_fifa, artilheiro, atualizado_em)
    VALUES (${uid}, ${fifa || null}, ${art || null}, now())
    ON CONFLICT (usuario_id)
    DO UPDATE SET campeao_fifa = ${fifa || null}, artilheiro = ${art || null}, atualizado_em = now()
  `;
  return null;
}

/** Resultado real dos bônus, quando já decidido. */
export async function getBonusReal(matches: Match[]): Promise<{
  campeaoFifa: string | null;
  artilheiros: string[]; // chaves canônicas dos goleadores no topo
  copaEncerrada: boolean;
}> {
  const final = matches.find((m) => m.fase === "Final");
  const copaEncerrada = final?.status === "encerrado";
  let campeaoFifa: string | null = null;
  if (
    copaEncerrada &&
    final &&
    final.placarMandante !== undefined &&
    final.placarVisitante !== undefined &&
    final.placarMandante !== final.placarVisitante
  ) {
    campeaoFifa =
      final.placarMandante > final.placarVisitante ? (final.fifaMandante ?? null) : (final.fifaVisitante ?? null);
  }
  let artilheiros: string[] = [];
  if (copaEncerrada) {
    const scorers = await getScorers(30);
    const topo = scorers[0]?.gols ?? 0;
    artilheiros = scorers.filter((s) => s.gols === topo && topo > 0).map((s) => chaveNome(s.jogador));
  }
  return { campeaoFifa, artilheiros, copaEncerrada };
}

export type BonusDoGrupo = Map<number, Bonus>;

export async function getBonusDoGrupo(grupoId: number): Promise<BonusDoGrupo> {
  const rows = (await sql()`
    SELECT b.usuario_id, b.campeao_fifa, b.artilheiro
    FROM palpites_bonus b
    JOIN grupo_membros m ON m.usuario_id = b.usuario_id AND m.grupo_id = ${grupoId}
  `) as { usuario_id: number; campeao_fifa: string | null; artilheiro: string | null }[];
  return new Map(
    rows.map((r) => [r.usuario_id, { campeaoFifa: r.campeao_fifa, artilheiro: r.artilheiro }]),
  );
}

// ---------- avisos ao logar ----------

export type Avisos = {
  /** Jogos nas próximas 24h ainda sem palpite. */
  semPalpite: number;
  /** Kickoff ISO do primeiro jogo sem palpite (para "fecha às HH:mm"). */
  primeiroFecha: string | null;
  /** Resumo de ontem (jogos encerrados no dia anterior, fuso de Brasília). */
  ontem: { jogos: number; pontos: number; exatos: number } | null;
  /** Posição do usuário em cada grupo (até 3). */
  posicoes: { nome: string; codigo: string; pos: number; total: number; pontos: number }[];
  /** false = conta ainda sem código de recuperação (avisar para gerar). */
  temRecuperacao: boolean;
};

export async function getAvisos(uid: number): Promise<Avisos> {
  const [matches, meus, grupos, temRecuperacao] = await Promise.all([
    getMatches(),
    palpitesDoUsuario(uid),
    meusGrupos(uid),
    temCodigoRecuperacao(uid),
  ]);

  const agora = Date.now();
  const em24h = matches
    .filter((m) => {
      if (!m.kickoffISO) return false;
      const k = Date.parse(m.kickoffISO);
      return k > agora && k - agora < 24 * 3600_000;
    })
    .sort((a, b) => a.kickoffISO!.localeCompare(b.kickoffISO!));
  const abertosSemPalpite = em24h.filter((m) => !meus.has(m.id));

  // "ontem" no fuso de Brasília
  const diaSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const ontemStr = diaSP.format(new Date(agora - 24 * 3600_000));
  let jogosOntem = 0;
  let pontosOntem = 0;
  let exatosOntem = 0;
  for (const m of matches) {
    if (m.status !== "encerrado" || !m.kickoffISO) continue;
    if (diaSP.format(new Date(m.kickoffISO)) !== ontemStr) continue;
    jogosOntem++;
    const p = meus.get(m.id);
    if (!p) continue;
    const v = pontosDoPalpite(p, m);
    if (v) pontosOntem += v;
    if (v === 3) exatosOntem++;
  }

  const posicoes: Avisos["posicoes"] = [];
  for (const g of grupos.slice(0, 3)) {
    const r = await rankingDoGrupo(g.id);
    const i = r.findIndex((l) => l.usuarioId === uid);
    if (i >= 0)
      posicoes.push({
        nome: g.nome,
        codigo: g.codigo,
        pos: i + 1,
        total: r.length,
        pontos: r[i].pontos,
      });
  }

  return {
    semPalpite: abertosSemPalpite.length,
    primeiroFecha: abertosSemPalpite[0]?.kickoffISO ?? null,
    ontem: jogosOntem > 0 ? { jogos: jogosOntem, pontos: pontosOntem, exatos: exatosOntem } : null,
    posicoes,
    temRecuperacao,
  };
}

// ---------- ranking ----------

export async function rankingDoGrupo(grupoId: number): Promise<LinhaRanking[]> {
  const [membrosRaw, porJogo, matches, bonusGrupo] = await Promise.all([
    sql()`
      SELECT u.id, u.nome FROM grupo_membros m JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.grupo_id = ${grupoId}
    `,
    palpitesDoGrupo(grupoId),
    getMatches(),
    getBonusDoGrupo(grupoId),
  ]);
  const membros = membrosRaw as { id: number; nome: string }[];
  const byId = new Map(matches.map((m) => [m.id, m]));

  const linhas = new Map<number, LinhaRanking>(
    membros.map((u) => [
      u.id,
      { usuarioId: u.id, nome: u.nome, pontos: 0, exatos: 0, resultados: 0, palpites: 0, bonus: 0 },
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

  // Bônus (campeão/artilheiro) entram quando a Copa termina.
  const real = await getBonusReal(matches);
  if (real.copaEncerrada) {
    for (const [uid, b] of bonusGrupo) {
      const linha = linhas.get(uid);
      if (!linha) continue;
      let ganho = 0;
      if (b.campeaoFifa && real.campeaoFifa && b.campeaoFifa === real.campeaoFifa)
        ganho += PONTOS_CAMPEAO;
      if (b.artilheiro && real.artilheiros.includes(chaveNome(b.artilheiro)))
        ganho += PONTOS_ARTILHEIRO;
      linha.bonus = ganho;
      linha.pontos += ganho;
    }
  }

  return [...linhas.values()].sort(
    (a, b) =>
      b.pontos - a.pontos || b.exatos - a.exatos || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
