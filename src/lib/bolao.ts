import { randomInt } from "node:crypto";
import { sql } from "./db";
import { temCodigoRecuperacao } from "./auth";
import { getMatches, getScorers } from "./worldcup";
import { chaveNome } from "./worldcup/squads";
import type { Goal, Match } from "./worldcup/types";

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
 *  - mata-mata, palpitou EMPATE e o jogo terminou empatado nos 90' (foi p/
 *    prorrogação/pênaltis): +1 se acertou quem AVANÇOU. Ex.: 1×1 cravado +
 *    vencedor certo = 3+1 = 4; palpitou 1×1, deu 2×2 + vencedor certo = 1+1 = 2.
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

export type Palpite = {
  golsMandante: number;
  golsVisitante: number;
  /** Mata-mata: FIFA escolhido p/ avançar quando o palpite é empate. */
  vencedorFifa?: string | null;
};

export type LinhaRanking = {
  usuarioId: number;
  nome: string;
  pontos: number;
  exatos: number;
  resultados: number;
  palpites: number;
  /** Quantos +1 por acertar quem avançou no mata-mata. */
  vencedores: number;
  /** Pontos de bônus (campeão/artilheiro), já somados em `pontos`. */
  bonus: number;
};

/** Mata-mata = qualquer fase fora da fase de grupos (16-avos até a final). */
export function ehMataMata(m: Match): boolean {
  return m.fase !== "Fase de Grupos";
}

/** Nova pontuação (90' + bônus de vencedor no mata-mata) vale a partir desta data. */
const INICIO_NOVA_PONTUACAO = "2026-07-01";

function usaNovaPontuacao(m: Match): boolean {
  return m.dataISO >= INICIO_NOVA_PONTUACAO;
}

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

/**
 * Minuto-base do gol, ignorando o acréscimo. As fontes divergem no formato:
 * openfootball manda string ("90+5", "45+3"); ESPN manda number já saturado (90).
 * Em ambos, a prorrogação tem base > 90 ("108", 108) e o acréscimo fica em 90/45.
 */
function minutoBase(minuto: Goal["minuto"]): number {
  const m = /^(\d+)/.exec(String(minuto ?? ""));
  return m ? Number(m[1]) : 0;
}

/** Gols marcados na prorrogação (base > 90'), por lado. Acréscimo (90'+x) NÃO entra aqui. */
function golsAposNoventa(m: Match): { mandante: number; visitante: number } {
  let mandante = 0;
  let visitante = 0;
  for (const g of m.gols) {
    if (minutoBase(g.minuto) <= 90) continue; // 90'+x e 45'+x são tempo normal → contam
    if (g.selecao === m.mandante) mandante++;
    else if (g.selecao === m.visitante) visitante++;
  }
  return { mandante, visitante };
}

/**
 * Placar dos 90' reconstruído pela timeline de gols (ignora prorrogação).
 * Só é usado quando a soma dos gols bate com o placar total (ou total − ET).
 */
function placarPorGols(m: Match): { mandante: number; visitante: number } | null {
  if (!m.gols.length || m.placarMandante === undefined || m.placarVisitante === undefined) {
    return null;
  }
  let mandante = 0;
  let visitante = 0;
  let etMandante = 0;
  let etVisitante = 0;
  for (const g of m.gols) {
    if (minutoBase(g.minuto) > 90) {
      if (g.selecao === m.mandante) etMandante++;
      else if (g.selecao === m.visitante) etVisitante++;
      continue;
    }
    if (g.selecao === m.mandante) mandante++;
    else if (g.selecao === m.visitante) visitante++;
  }
  const totalM = m.placarMandante;
  const totalV = m.placarVisitante;
  const bateTotal = mandante === totalM && visitante === totalV;
  const bateComEt = mandante + etMandante === totalM && visitante + etVisitante === totalV;
  if (!bateTotal && !bateComEt) return null;
  return { mandante, visitante };
}

/**
 * Placar que VALE para o bolão: só o tempo normal (90'), sem prorrogação nem pênaltis.
 * Parte do placar oficial e desconta apenas os gols marcados depois dos 90'.
 * Retorna null enquanto não há placar.
 */
export function placarValido(m: Match): { mandante: number; visitante: number } | null {
  if (m.placarMandante === undefined || m.placarVisitante === undefined) return null;
  // Jogos anteriores à nova regra: placar oficial sem ajuste de prorrogação.
  if (!usaNovaPontuacao(m)) {
    return { mandante: m.placarMandante, visitante: m.placarVisitante };
  }
  // score.ft do openfootball já é o placar dos 90' — não descontar gols de prorrogação.
  if (m.placarDos90) {
    return { mandante: m.placarMandante, visitante: m.placarVisitante };
  }
  // ESPN / ao vivo: timeline de gols é a fonte mais confiável p/ separar 90' de ET.
  const porGols = placarPorGols(m);
  if (porGols) return porGols;
  const extra = golsAposNoventa(m);
  return {
    mandante: Math.max(0, m.placarMandante - extra.mandante),
    visitante: Math.max(0, m.placarVisitante - extra.visitante),
  };
}

function comparar(p: Palpite, mandante: number, visitante: number): number {
  if (p.golsMandante === mandante && p.golsVisitante === visitante) return 3;
  return Math.sign(p.golsMandante - p.golsVisitante) === Math.sign(mandante - visitante) ? 1 : 0;
}

/**
 * +1 do mata-mata: o usuário palpitou EMPATE, escolheu quem avança e o jogo
 * realmente terminou empatado nos 90' (foi p/ prorrogação/pênaltis), com o time
 * escolhido sendo quem venceu. Fora desse cenário (jogo decidido nos 90', palpite
 * que não era empate, ou sem escolha de vencedor) vale 0.
 */
function bonusVencedor(
  p: Palpite,
  m: Match,
  placar: { mandante: number; visitante: number },
): number {
  if (!usaNovaPontuacao(m)) return 0;
  if (!ehMataMata(m)) return 0;
  if (p.golsMandante !== p.golsVisitante) return 0; // não palpitou empate
  if (placar.mandante !== placar.visitante) return 0; // o jogo não empatou nos 90'
  if (!p.vencedorFifa || !m.vencedorFifa) return 0;
  return p.vencedorFifa === m.vencedorFifa ? 1 : 0;
}

/** Decomposição dos pontos de um palpite: placar/resultado (`base`) + `bonus` do vencedor. */
export type DetalhePalpite = { base: number; bonus: number; total: number };

/**
 * Detalhe dos pontos: vale o placar dos 90' (prorrogação/pênaltis não contam no `base`),
 * mais o +1 do vencedor no mata-mata. Conta também AO VIVO (placar parcial); o `bonus`
 * só aparece com o jogo encerrado, quando se sabe quem avançou. null enquanto não há placar.
 */
export function detalhePalpite(p: Palpite, m: Match): DetalhePalpite | null {
  if (m.status === "agendado") return null;
  const placar = placarValido(m);
  if (!placar) return null;
  const base = comparar(p, placar.mandante, placar.visitante);
  const bonus = bonusVencedor(p, m, placar);
  return { base, bonus, total: base + bonus };
}

/**
 * Pontos de um palpite num jogo ENCERRADO: base (3 exato / 1 resultado / 0) + bônus do
 * vencedor no mata-mata. null se não encerrou. Vale o placar dos 90'.
 */
export function pontosDoPalpite(p: Palpite, m: Match): number | null {
  if (m.status !== "encerrado") return null;
  return detalhePalpite(p, m)?.total ?? null;
}

/**
 * Pontos "se acabar agora": igual a {@link pontosDoPalpite}, mas conta também em jogo
 * AO VIVO usando o placar parcial (sempre nos 90'). Retorna null só enquanto não há placar.
 */
export function pontosParciais(p: Palpite, m: Match): number | null {
  return detalhePalpite(p, m)?.total ?? null;
}

export type LinhaAoVivo = LinhaRanking & {
  /** Pontos provisórios somados dos jogos ao vivo ("se acabar agora"). */
  aoVivo: number;
  /** Quantos pontos provisórios são placar exato (pra dar destaque). */
  exatosAoVivo: number;
  /** `pontos` + `aoVivo`: base da ordenação provisória. */
  total: number;
  /** Variação de posição vs. ranking oficial: >0 subiu, <0 caiu, 0 igual. */
  variacao: number;
};

/**
 * Classificação PROVISÓRIA: parte do ranking oficial e soma os pontos parciais
 * dos jogos ao vivo, reordenando. `variacao` diz quantas posições cada um sobe
 * (>0) ou desce (<0) em relação ao oficial. `temAoVivo` indica se há jogo rolando.
 */
export function classificacaoAoVivo(
  ranking: LinhaRanking[],
  porJogo: Map<number, { usuarioId: number; nome: string; palpite: Palpite }[]>,
  matches: Match[],
): { linhas: LinhaAoVivo[]; temAoVivo: boolean } {
  const aoVivoMatches = matches.filter((m) => m.status === "ao-vivo");
  const delta = new Map<number, { pts: number; exatos: number }>();
  for (const m of aoVivoMatches) {
    for (const p of porJogo.get(m.id) ?? []) {
      const pts = pontosParciais(p.palpite, m);
      if (!pts) continue;
      const cur = delta.get(p.usuarioId) ?? { pts: 0, exatos: 0 };
      cur.pts += pts;
      if (pts === 3) cur.exatos++;
      delta.set(p.usuarioId, cur);
    }
  }

  const posOficial = new Map(ranking.map((l, i) => [l.usuarioId, i]));
  const linhas: LinhaAoVivo[] = ranking
    .map((l) => {
      const d = delta.get(l.usuarioId) ?? { pts: 0, exatos: 0 };
      return { ...l, aoVivo: d.pts, exatosAoVivo: d.exatos, total: l.pontos + d.pts, variacao: 0 };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.exatos + b.exatosAoVivo - (a.exatos + a.exatosAoVivo) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
  linhas.forEach((l, i) => {
    l.variacao = (posOficial.get(l.usuarioId) ?? i) - i;
  });

  return { linhas, temAoVivo: aoVivoMatches.length > 0 };
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

/** Quem já pagou a entrada (uid -> pagou), para exibir no ranking. */
export async function pagamentosDoGrupo(grupoId: number): Promise<Map<number, boolean>> {
  const rows = (await sql()`
    SELECT usuario_id, pagou FROM grupo_membros WHERE grupo_id = ${grupoId}
  `) as { usuario_id: number; pagou: boolean }[];
  return new Map(rows.map((r) => [r.usuario_id, r.pagou]));
}

/** Marca/desmarca pagamento de um membro. Só o dono do grupo pode. */
/** Quem o grupo já reconhece como líder (último a ser "coroado"). null = ninguém ainda. */
export async function liderReconhecido(grupoId: number): Promise<number | null> {
  const rows = (await sql()`
    SELECT lider_atual_id FROM grupos WHERE id = ${grupoId}
  `) as { lider_atual_id: number | null }[];
  return rows[0]?.lider_atual_id ?? null;
}

/**
 * "Coroa" o líder OFICIAL atual do grupo (chamado quando o novo líder vê o aviso).
 * Idempotente: só grava se mudou de mãos. Sem líder com pontos, não faz nada.
 */
export async function reconhecerLider(grupoId: number): Promise<void> {
  try {
    const ranking = await rankingDoGrupo(grupoId);
    const lider = ranking[0];
    if (!lider || lider.pontos <= 0) return;
    await sql()`
      UPDATE grupos SET lider_atual_id = ${lider.usuarioId}
      WHERE id = ${grupoId} AND lider_atual_id IS DISTINCT FROM ${lider.usuarioId}
    `;
  } catch {
    /* coluna ainda não migrada — ignora */
  }
}

export async function marcarPagamento(
  donoUid: number,
  grupoId: number,
  usuarioId: number,
  pagou: boolean,
): Promise<string | null> {
  const rows = (await sql()`
    SELECT dono_id FROM grupos WHERE id = ${grupoId}
  `) as { dono_id: number }[];
  if (rows[0]?.dono_id !== donoUid) return "Só o dono do grupo pode marcar pagamentos.";
  await sql()`
    UPDATE grupo_membros SET pagou = ${pagou}
    WHERE grupo_id = ${grupoId} AND usuario_id = ${usuarioId}
  `;
  return null;
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
  vencedorFifa: string | null = null,
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

  // No mata-mata, palpite de empate PODE escolher quem avança (vale +1, opcional).
  // Sem escolha o palpite conta normal — empate certo segue valendo (1 ou 3 pts).
  let venc: string | null = null;
  if (ehMataMata(m) && golsMandante === golsVisitante) {
    const v = (vencedorFifa ?? "").trim().toUpperCase();
    if (v && v !== m.fifaMandante && v !== m.fifaVisitante) {
      return "Escolha de vencedor inválida — tem de ser um dos dois times.";
    }
    venc = v || null;
  }

  await sql()`
    INSERT INTO palpites (usuario_id, match_id, gols_mandante, gols_visitante, vencedor_fifa, atualizado_em)
    VALUES (${uid}, ${matchId}, ${golsMandante}, ${golsVisitante}, ${venc}, now())
    ON CONFLICT (usuario_id, match_id)
    DO UPDATE SET gols_mandante = ${golsMandante}, gols_visitante = ${golsVisitante}, vencedor_fifa = ${venc}, atualizado_em = now()
  `;
  return null;
}

export async function palpitesDoUsuario(uid: number): Promise<Map<number, Palpite>> {
  const rows = (await sql()`
    SELECT match_id, gols_mandante, gols_visitante, vencedor_fifa FROM palpites WHERE usuario_id = ${uid}
  `) as {
    match_id: number;
    gols_mandante: number;
    gols_visitante: number;
    vencedor_fifa: string | null;
  }[];
  return new Map(
    rows.map((r) => [
      r.match_id,
      { golsMandante: r.gols_mandante, golsVisitante: r.gols_visitante, vencedorFifa: r.vencedor_fifa },
    ]),
  );
}

/** Palpites de todos os membros do grupo, agrupados por jogo. */
export async function palpitesDoGrupo(
  grupoId: number,
): Promise<Map<number, { usuarioId: number; nome: string; palpite: Palpite }[]>> {
  const rows = (await sql()`
    SELECT p.match_id, p.gols_mandante, p.gols_visitante, p.vencedor_fifa, u.id AS usuario_id, u.nome
    FROM palpites p
    JOIN grupo_membros m ON m.usuario_id = p.usuario_id AND m.grupo_id = ${grupoId}
    JOIN usuarios u ON u.id = p.usuario_id
    ORDER BY u.nome
  `) as {
    match_id: number;
    gols_mandante: number;
    gols_visitante: number;
    vencedor_fifa: string | null;
    usuario_id: number;
    nome: string;
  }[];
  const porJogo = new Map<number, { usuarioId: number; nome: string; palpite: Palpite }[]>();
  for (const r of rows) {
    const lista = porJogo.get(r.match_id) ?? [];
    lista.push({
      usuarioId: r.usuario_id,
      nome: r.nome,
      palpite: {
        golsMandante: r.gols_mandante,
        golsVisitante: r.gols_visitante,
        vencedorFifa: r.vencedor_fifa,
      },
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

  // Bônus é DEFINITIVO: o que já foi salvo não muda mais, só completa o que falta.
  const atual = await getBonus(uid);
  if (atual.campeaoFifa && fifa && fifa !== atual.campeaoFifa) {
    return "Palpite de campeã é definitivo — não dá mais para trocar. 🔒";
  }
  if (atual.artilheiro && art && chaveNome(art) !== chaveNome(atual.artilheiro)) {
    return "Palpite de artilheiro é definitivo — não dá mais para trocar. 🔒";
  }
  const campeaoFinal = atual.campeaoFifa ?? (fifa || null);
  const artilheiroFinal = atual.artilheiro ?? (art || null);
  if (!campeaoFinal && !artilheiroFinal) return "Escolha pelo menos um palpite bônus.";
  if (campeaoFinal === atual.campeaoFifa && artilheiroFinal === atual.artilheiro) {
    return null; // nada novo para gravar
  }

  await sql()`
    INSERT INTO palpites_bonus (usuario_id, campeao_fifa, artilheiro, atualizado_em)
    VALUES (${uid}, ${campeaoFinal}, ${artilheiroFinal}, now())
    ON CONFLICT (usuario_id)
    DO UPDATE SET campeao_fifa = ${campeaoFinal}, artilheiro = ${artilheiroFinal}, atualizado_em = now()
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

/** Pontuação de um jogo na forma recente: 3 = placar exato, 1 = resultado, 0 = errou. */
export type FormaJogo = { pts: number; adversarios: string };

/**
 * Forma recente de cada participante: os últimos jogos encerrados que ele palpitou,
 * em ordem cronológica (mais antigo → mais recente). Substitui o "saco de emojis".
 */
export async function formaDoGrupo(grupoId: number, ultimos = 3): Promise<Map<number, FormaJogo[]>> {
  const [ranking, porJogo, matches] = await Promise.all([
    rankingDoGrupo(grupoId),
    palpitesDoGrupo(grupoId),
    getMatches(),
  ]);

  const encerrados = matches
    .filter((m) => m.status === "encerrado" && m.kickoffISO)
    .sort((a, b) => a.kickoffISO!.localeCompare(b.kickoffISO!));

  const out = new Map<number, FormaJogo[]>();
  for (const l of ranking) {
    const historico: FormaJogo[] = [];
    for (const m of encerrados) {
      const p = (porJogo.get(m.id) ?? []).find((x) => x.usuarioId === l.usuarioId);
      if (!p) continue;
      const pts = pontosDoPalpite(p.palpite, m) ?? 0;
      historico.push({
        pts,
        adversarios: `${m.fifaMandante ?? "?"} ${m.placarMandante ?? "-"}×${m.placarVisitante ?? "-"} ${m.fifaVisitante ?? "?"}`,
      });
    }
    const forma = historico.slice(-ultimos);
    if (forma.length) out.set(l.usuarioId, forma);
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
      {
        usuarioId: u.id,
        nome: u.nome,
        pontos: 0,
        exatos: 0,
        resultados: 0,
        palpites: 0,
        vencedores: 0,
        bonus: 0,
      },
    ]),
  );
  for (const [matchId, palpites] of porJogo) {
    const m = byId.get(matchId);
    if (!m) continue;
    for (const p of palpites) {
      const linha = linhas.get(p.usuarioId);
      if (!linha) continue;
      linha.palpites++;
      if (m.status !== "encerrado") continue;
      const d = detalhePalpite(p.palpite, m);
      if (!d) continue;
      linha.pontos += d.total;
      if (d.base === 3) linha.exatos++;
      else if (d.base === 1) linha.resultados++;
      if (d.bonus > 0) linha.vencedores++;
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
