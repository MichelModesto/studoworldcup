import { randomInt } from "node:crypto";
import { sql } from "./db";
import { temCodigoRecuperacao } from "./auth";
import { getMatches, getScorers } from "./worldcup";
import { chaveNome } from "./worldcup/squads";
import { listTeamStats } from "./worldcup/team-stats";
import type { Match } from "./worldcup/types";

const DIA_SP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

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
  /** PIX copia-e-cola da entrada do bolão (opcional, definido pelo dono). */
  pix: string | null;
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
      return { id, nome: nomeLimpo, codigo, donoId: uid, membros: 1, pix: null };
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
    SELECT g.id, g.nome, g.codigo, g.dono_id, g.pix,
           (SELECT count(*)::int FROM grupo_membros m WHERE m.grupo_id = g.id) AS membros
    FROM grupos g WHERE g.codigo = ${cod}
  `) as { id: number; nome: string; codigo: string; dono_id: number; membros: number; pix: string | null }[];
  const g = rows[0];
  if (!g) return { erro: "Grupo não encontrado. Confira o código com quem te convidou." };
  await sql()`
    INSERT INTO grupo_membros (grupo_id, usuario_id)
    VALUES (${g.id}, ${uid})
    ON CONFLICT DO NOTHING
  `;
  return { id: g.id, nome: g.nome, codigo: g.codigo, donoId: g.dono_id, membros: g.membros, pix: g.pix };
}

export async function meusGrupos(uid: number): Promise<Grupo[]> {
  const rows = (await sql()`
    SELECT g.id, g.nome, g.codigo, g.dono_id, g.pix,
           (SELECT count(*)::int FROM grupo_membros m2 WHERE m2.grupo_id = g.id) AS membros
    FROM grupos g
    JOIN grupo_membros m ON m.grupo_id = g.id AND m.usuario_id = ${uid}
    ORDER BY g.criado_em
  `) as { id: number; nome: string; codigo: string; dono_id: number; membros: number; pix: string | null }[];
  return rows.map((g) => ({
    id: g.id,
    nome: g.nome,
    codigo: g.codigo,
    donoId: g.dono_id,
    membros: g.membros,
    pix: g.pix,
  }));
}

export async function getGrupoPorCodigo(codigo: string): Promise<Grupo | null> {
  const cod = normalizarCodigo(codigo);
  const rows = (await sql()`
    SELECT g.id, g.nome, g.codigo, g.dono_id, g.pix,
           (SELECT count(*)::int FROM grupo_membros m WHERE m.grupo_id = g.id) AS membros
    FROM grupos g WHERE g.codigo = ${cod}
  `) as { id: number; nome: string; codigo: string; dono_id: number; membros: number; pix: string | null }[];
  const g = rows[0];
  return g
    ? { id: g.id, nome: g.nome, codigo: g.codigo, donoId: g.dono_id, membros: g.membros, pix: g.pix }
    : null;
}

/** Extrai valor (tag 54) e nome do recebedor (tag 59) de um PIX copia-e-cola (EMV). */
export function lerPix(pix: string): { valor: string | null; nome: string | null } {
  let valor: string | null = null;
  let nome: string | null = null;
  try {
    let i = 0;
    while (i + 4 <= pix.length) {
      const tag = pix.slice(i, i + 2);
      const len = parseInt(pix.slice(i + 2, i + 4), 10);
      if (Number.isNaN(len)) break;
      const conteudo = pix.slice(i + 4, i + 4 + len);
      if (tag === "54") valor = conteudo;
      if (tag === "59") nome = conteudo;
      i += 4 + len;
    }
  } catch {
    /* código fora do padrão: mostra sem detalhes */
  }
  return { valor, nome };
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

// ---------- evolução do ranking (gráfico) ----------

export type DiaEvolucao = { dia: string } & Record<string, number | string>;

/**
 * Pontos acumulados por participante a cada dia com jogos encerrados.
 * Derivado na hora de palpites × resultados — sem tabela de histórico.
 */
export async function evolucaoDoGrupo(
  grupoId: number,
): Promise<{ dias: DiaEvolucao[]; nomes: string[] }> {
  const [ranking, porJogo, matches] = await Promise.all([
    rankingDoGrupo(grupoId),
    palpitesDoGrupo(grupoId),
    getMatches(),
  ]);
  const nomes = ranking.map((l) => l.nome);
  const nomePorId = new Map(ranking.map((l) => [l.usuarioId, l.nome]));

  const encerrados = matches
    .filter((m) => m.status === "encerrado" && m.kickoffISO)
    .sort((a, b) => a.kickoffISO!.localeCompare(b.kickoffISO!));
  if (!encerrados.length) return { dias: [], nomes };

  const acumulado = new Map<string, number>(nomes.map((n) => [n, 0]));
  const dias: DiaEvolucao[] = [];
  let diaAtual = "";
  for (const m of encerrados) {
    const dia = DIA_SP.format(new Date(m.kickoffISO!));
    if (dia !== diaAtual) {
      diaAtual = dia;
      dias.push({
        dia: DIA_CURTO.format(new Date(m.kickoffISO!)),
        ...Object.fromEntries(acumulado),
      });
    }
    for (const p of porJogo.get(m.id) ?? []) {
      const nome = nomePorId.get(p.usuarioId);
      if (!nome) continue;
      const pts = pontosDoPalpite(p.palpite, m) ?? 0;
      acumulado.set(nome, (acumulado.get(nome) ?? 0) + pts);
    }
    // atualiza a última entrada do dia com o acumulado pós-jogo
    Object.assign(dias[dias.length - 1], Object.fromEntries(acumulado));
  }
  return { dias, nomes };
}

// ---------- conquistas (badges) ----------

export type Conquista = { emoji: string; titulo: string };

/** Badges calculados na hora a partir do histórico de cada participante. */
export async function conquistasDoGrupo(grupoId: number): Promise<Map<number, Conquista[]>> {
  const [ranking, porJogo, matches, allStats] = await Promise.all([
    rankingDoGrupo(grupoId),
    palpitesDoGrupo(grupoId),
    getMatches(),
    listTeamStats().catch(() => []),
  ]);
  const aproveitamento = new Map(
    allStats.map((s) => {
      const j = Math.max(1, s.jogos);
      return [s.fifa, (3 * s.registro.v + s.registro.e) / (3 * j)];
    }),
  );

  const encerrados = matches
    .filter((m) => m.status === "encerrado" && m.kickoffISO)
    .sort((a, b) => a.kickoffISO!.localeCompare(b.kickoffISO!));

  const out = new Map<number, Conquista[]>();
  for (const l of ranking) {
    const historico: number[] = []; // pontos por jogo encerrado palpitado, em ordem
    let zebras = 0;
    let palpitados = 0;
    for (const m of encerrados) {
      const p = (porJogo.get(m.id) ?? []).find((x) => x.usuarioId === l.usuarioId);
      if (!p) continue;
      palpitados++;
      const pts = pontosDoPalpite(p.palpite, m) ?? 0;
      historico.push(pts);
      // zebra: acertou resultado de vitória de um time historicamente mais fraco
      if (pts > 0 && m.fifaMandante && m.fifaVisitante && m.placarMandante !== m.placarVisitante) {
        const venceuMandante = (m.placarMandante ?? 0) > (m.placarVisitante ?? 0);
        const vencedor = venceuMandante ? m.fifaMandante : m.fifaVisitante;
        const perdedor = venceuMandante ? m.fifaVisitante : m.fifaMandante;
        const av = aproveitamento.get(vencedor);
        const ap = aproveitamento.get(perdedor);
        if (av !== undefined && ap !== undefined && av + 0.1 < ap) zebras++;
      }
    }
    const conquistas: Conquista[] = [];
    if (l.exatos >= 1) conquistas.push({ emoji: "🎯", titulo: "Na mosca: acertou placar exato" });
    const ult3 = historico.slice(-3);
    if (ult3.length === 3 && ult3.every((p) => p > 0))
      conquistas.push({ emoji: "🔥", titulo: "Em chamas: pontuou nos últimos 3 jogos" });
    if (ult3.length === 3 && ult3.every((p) => p === 0))
      conquistas.push({ emoji: "🥶", titulo: "Gelado: zerou os últimos 3 jogos" });
    if (encerrados.length >= 3 && palpitados === encerrados.length)
      conquistas.push({ emoji: "💯", titulo: "Assíduo: palpitou em todos os jogos até agora" });
    if (zebras >= 1)
      conquistas.push({ emoji: "🦓", titulo: "Zebrólogo: acertou vitória de azarão" });
    if (conquistas.length) out.set(l.usuarioId, conquistas);
  }
  return out;
}

// ---------- jogo do dia ----------

export type JogoDoDia = {
  match: Match;
  meuPalpite: Palpite | null;
  /** Quantos dos meus colegas de grupo (todos os grupos) já palpitaram. */
  palpitaram: number;
  colegas: number;
};

export async function getJogoDoDia(uid: number): Promise<JogoDoDia | null> {
  const [matches, meus, grupos] = await Promise.all([
    getMatches(),
    palpitesDoUsuario(uid),
    meusGrupos(uid),
  ]);
  const agora = Date.now();
  const proximo = matches
    .filter((m) => m.kickoffISO && Date.parse(m.kickoffISO) > agora)
    .sort((a, b) => a.kickoffISO!.localeCompare(b.kickoffISO!))[0];
  if (!proximo) return null;

  let palpitaram = 0;
  let colegas = 0;
  if (grupos.length) {
    const gids = grupos.map((g) => g.id);
    const rows = (await sql()`
      SELECT count(DISTINCT m.usuario_id)::int AS colegas,
             count(DISTINCT p.usuario_id)::int AS palpitaram
      FROM grupo_membros m
      LEFT JOIN palpites p
        ON p.usuario_id = m.usuario_id AND p.match_id = ${proximo.id}
      WHERE m.grupo_id = ANY(${gids}) AND m.usuario_id <> ${uid}
    `) as { colegas: number; palpitaram: number }[];
    colegas = rows[0]?.colegas ?? 0;
    palpitaram = rows[0]?.palpitaram ?? 0;
  }
  return { match: proximo, meuPalpite: meus.get(proximo.id) ?? null, palpitaram, colegas };
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
