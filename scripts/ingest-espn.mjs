#!/usr/bin/env node
/**
 * Ingestão de dados reais das seleções (2023+) via ESPN (gratuita, sem chave).
 *
 * Fontes:
 *  - site.api.espn.com: agenda por seleção/competição e resumo do jogo (gols/cartões com minuto).
 *  - sports.core.api.espn.com: estatísticas de equipe por jogo (chutes, posse, escanteios etc.).
 *
 * Saída (mesmo formato do ingest.mjs): data/teams/<FIFA>.json + data/raw/<FIFA>.json.
 *
 * Uso:
 *   node scripts/ingest-espn.mjs --teams=MEX
 *   node scripts/ingest-espn.mjs --teams=MEX,CZE,BIH
 *   node scripts/ingest-espn.mjs                      # todas as que faltam
 *   node scripts/ingest-espn.mjs --max-matches=15 --delay=400 --force
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// ---------- args ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const SEASONS = String(args.seasons ?? "2023,2024,2025,2026").split(",").map(Number);
const MAX_MATCHES = Number(args["max-matches"] ?? 15); // mantém paridade com RSA/KOR
const DELAY = Number(args.delay ?? 400); // consumo moderado (~2.5 req/s)
const FORCE = Boolean(args.force);
const FILTER = args.teams ? String(args.teams).toUpperCase().split(",") : null;
const DESDE = "2023-01-01";

const ROOT = process.cwd();
const DIR_TEAMS = path.join(ROOT, "data", "teams");
const DIR_RAW = path.join(ROOT, "data", "raw");
const DIR_CACHE = path.join(ROOT, "data", ".cache");
const FXDIR = path.join(DIR_CACHE, "espn");

const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const CORE = "https://sports.core.api.espn.com/v2/sports/soccer/leagues";

// PT names (apenas informativo no JSON)
const PT = {
  RSA: "África do Sul", KOR: "Coreia do Sul", MEX: "México", CZE: "Tchéquia",
  CAN: "Canadá", BIH: "Bósnia e Herzegovina", QAT: "Catar", SUI: "Suíça",
  BRA: "Brasil", MAR: "Marrocos", HAI: "Haiti", SCO: "Escócia", USA: "Estados Unidos",
  PAR: "Paraguai", AUS: "Austrália", TUR: "Turquia", GER: "Alemanha", CUW: "Curaçao",
  CIV: "Costa do Marfim", ECU: "Equador", NED: "Holanda", JPN: "Japão", SWE: "Suécia",
  TUN: "Tunísia", BEL: "Bélgica", EGY: "Egito", IRN: "Irã", NZL: "Nova Zelândia",
  ESP: "Espanha", CPV: "Cabo Verde", KSA: "Arábia Saudita", URU: "Uruguai", FRA: "França",
  SEN: "Senegal", IRQ: "Iraque", NOR: "Noruega", ARG: "Argentina", ALG: "Argélia",
  AUT: "Áustria", JOR: "Jordânia", POR: "Portugal", COD: "RD Congo", UZB: "Uzbequistão",
  COL: "Colômbia", ENG: "Inglaterra", CRO: "Croácia", GHA: "Gana", PAN: "Panamá",
};

// Nomes para casar com a ESPN quando abreviação/nome do openfootball não bate
const ESPN_NAME = {
  KOR: "South Korea", USA: "United States", CIV: "Ivory Coast", IRN: "Iran",
  CZE: "Czech Republic", COD: "DR Congo", CPV: "Cape Verde Islands",
  BIH: "Bosnia and Herzegovina", NED: "Netherlands", UAE: "United Arab Emirates",
};

// Ligas de seleções por confederação (+ comuns a todas)
const COMMON_LEAGUES = ["fifa.friendly", "fifa.world", "fifa.wcq.ply"];
const CONFED_LEAGUES = {
  uefa: ["fifa.worldq.uefa", "uefa.nations", "uefa.euro", "uefa.euroq"],
  conmebol: ["fifa.worldq.conmebol", "conmebol.america"],
  concacaf: ["fifa.worldq.concacaf", "concacaf.nations.league", "concacaf.gold"],
  caf: ["fifa.worldq.caf", "caf.nations", "caf.nations_qual"],
  afc: ["fifa.worldq.afc", "afc.asian.cup"],
  ofc: ["fifa.worldq.ofc", "fifa.worldq.concacaf.ofc"],
};
// Hosts não disputam eliminatórias; confederação definida à mão.
const CONFED_OVERRIDE = { MEX: "concacaf", USA: "concacaf", CAN: "concacaf" };

let requests = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readJSON(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function fetchJSON(url) {
  requests++;
  await sleep(DELAY);
  for (let tent = 1; tent <= 3; tent++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
      if (res.status === 429 || res.status >= 500) {
        console.warn(`  ⏳ HTTP ${res.status} — aguardando ${15 * tent}s...`);
        await sleep(15000 * tent);
        continue;
      }
      const json = await res.json().catch(() => ({}));
      return json;
    } catch (err) {
      if (tent === 3) throw err;
      await sleep(5000 * tent);
    }
  }
  return {};
}

// Cache por requisição (data/.cache/espn). Re-rodar não refaz downloads.
async function cached(name, url) {
  const file = path.join(FXDIR, `${name}.json`);
  const hit = await readJSON(file, null);
  if (hit) return hit;
  const data = await fetchJSON(url);
  await writeFile(file, JSON.stringify(data));
  return data;
}

// ---------- resolução de id ESPN + confederação ----------
function normNomeTime(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildEspnIndex() {
  const file = path.join(DIR_CACHE, "espn-team-index.json");
  const hit = await readJSON(file, null);
  if (hit) return hit;
  const index = {}; // normName -> { id, abbrev, confed, displayName }
  const fontes = [
    ...Object.entries(CONFED_LEAGUES).map(([confed, ls]) => ({ confed, league: ls[0] })),
    { confed: null, league: "fifa.friendly" },
  ];
  for (const { confed, league } of fontes) {
    const d = await fetchJSON(`${SITE}/${league}/teams?limit=400`);
    const teams = d?.sports?.[0]?.leagues?.[0]?.teams ?? [];
    for (const { team } of teams) {
      const entry = {
        id: team.id,
        abbrev: (team.abbreviation ?? "").toUpperCase(),
        confed,
        displayName: team.displayName,
      };
      for (const nome of [team.displayName, team.shortDisplayName, team.name, team.location]) {
        const k = normNomeTime(nome);
        if (!k) continue;
        // confed da eliminatória prevalece sobre o null dos amistosos
        if (!index[k] || (index[k].confed == null && confed)) index[k] = entry;
      }
      const ka = `abbrev:${entry.abbrev}`;
      if (entry.abbrev && (!index[ka] || (index[ka].confed == null && confed))) index[ka] = entry;
    }
  }
  await writeFile(file, JSON.stringify(index, null, 1));
  return index;
}

function resolveEspn(team, index) {
  const porAbbrev = index[`abbrev:${team.fifa}`];
  const candidatos = [ESPN_NAME[team.fifa], team.name, team.name_normalised, PT[team.fifa]]
    .filter(Boolean)
    .map(normNomeTime);
  const porNome = candidatos.map((c) => index[c]).find(Boolean);
  const hit = porNome ?? porAbbrev; // nome explícito ganha de abreviação ambígua
  if (!hit) return null;
  const confed = CONFED_OVERRIDE[team.fifa] ?? hit.confed ?? null;
  return { ...hit, confed };
}

// ---------- agregação (idêntica ao ingest.mjs) ----------
const JANELAS = ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90"];
function janelaDe(min) {
  if (min <= 15) return "0-15";
  if (min <= 30) return "16-30";
  if (min <= 45) return "31-45";
  if (min <= 60) return "46-60";
  if (min <= 75) return "61-75";
  return "76-90";
}
function normNome(nome) {
  return nome.toLowerCase().replace(/\./g, "").split(/[\s-]+/).filter(Boolean).sort().join(" ");
}
function round(v, dec = 1) {
  return Math.round(v * 10 ** dec) / 10 ** dec;
}

// "39'", "45'+2'", "90'+5'" -> minuto base (acréscimo satura na janela, como antes)
function minutoDe(clock) {
  const m = /^(\d+)/.exec(String(clock ?? ""));
  return m ? Number(m[1]) : 0;
}

function flatStats(core) {
  const out = {};
  for (const cat of core?.splits?.categories ?? []) {
    for (const s of cat.stats ?? []) out[s.name] = s.value;
  }
  return out;
}

async function processTeam(team, index) {
  const out = path.join(DIR_TEAMS, `${team.fifa}.json`);
  if (!FORCE && (await readJSON(out, null))) {
    console.log(`↩︎  ${team.fifa} já existe (use --force para refazer). Pulando.`);
    return;
  }
  console.log(`\n🌍 ${team.fifa} — ${PT[team.fifa] ?? team.name}`);
  const espn = resolveEspn(team, index);
  if (!espn) {
    console.warn(`  ✗ ${team.fifa}: id ESPN não resolvido (ajuste ESPN_NAME no script).`);
    return;
  }
  console.log(`  ✓ ESPN id ${espn.id} (${espn.displayName}) · confed: ${espn.confed ?? "?"}`);
  const id = String(espn.id);
  const ligas = [...COMMON_LEAGUES, ...(CONFED_LEAGUES[espn.confed] ?? [])];

  // 1) agenda por liga × temporada (com cache), dedupe por id do evento
  const agora = new Date().toISOString();
  const porId = new Map();
  for (const league of ligas) {
    for (const season of SEASONS) {
      const d = await cached(
        `sched-${id}-${league}-${season}`,
        `${SITE}/${league}/teams/${id}/schedule?season=${season}`,
      );
      for (const e of d?.events ?? []) {
        if (!e?.id || porId.has(e.id)) continue;
        if (!e.date || e.date < DESDE || e.date > agora) continue;
        porId.set(e.id, { id: e.id, date: e.date, name: e.name, league });
      }
    }
  }
  const todos = [...porId.values()].sort((a, b) => b.date.localeCompare(a.date));
  const selecionados = todos.slice(0, MAX_MATCHES);
  console.log(`  → analisando os ${selecionados.length} jogos mais recentes (de ${todos.length} desde 2023)`);

  const acc = {
    jogos: 0, gp: 0, ga: 0, v: 0, e: 0, d: 0,
    competicoes: new Set(),
    statsCount: 0,
    soma: { chutes: 0, chutesNoGol: 0, escanteios: 0, faltas: 0, impedimentos: 0, amarelos: 0, vermelhos: 0, posse: 0, defesasGoleiro: 0, desarmes: 0 },
    golsJanela: Object.fromEntries(JANELAS.map((j) => [j, 0])),
    gaJanela: Object.fromEntries(JANELAS.map((j) => [j, 0])),
    golsTempo: { "1T": 0, "2T": 0 },
    amarelosJanela: Object.fromEntries(JANELAS.map((j) => [j, 0])),
    scorers: {}, assists: {},
  };
  const raw = [];

  for (const ev of selecionados) {
    const sum = await cached(`summary-${ev.id}`, `${SITE}/${ev.league}/summary?event=${ev.id}`);
    const comp = sum?.header?.competitions?.[0];
    const statusName = comp?.status?.type?.name ?? "";
    if (!statusName.startsWith("STATUS_FULL_TIME") && statusName !== "STATUS_FINAL" && !statusName.startsWith("STATUS_FINAL_")) {
      continue; // não finalizado (adiado, cancelado, ao vivo)
    }
    const nosso = comp?.competitors?.find((c) => String(c.team?.id) === id);
    const rival = comp?.competitors?.find((c) => String(c.team?.id) !== id);
    if (!nosso || !rival) continue;
    const gf = Number(nosso.score ?? 0);
    const gc = Number(rival.score ?? 0);
    acc.jogos++;
    acc.gp += gf; acc.ga += gc;
    if (gf > gc) acc.v++; else if (gf < gc) acc.d++; else acc.e++;
    const ligaNome = sum?.header?.league?.name ?? ev.league;
    acc.competicoes.add(ligaNome);

    // estatísticas de equipe (API core)
    const core = await cached(
      `stats-${ev.id}-${id}`,
      `${CORE}/${ev.league}/events/${ev.id}/competitions/${ev.id}/competitors/${id}/statistics`,
    );
    const st = flatStats(core);
    if (Object.keys(st).length) {
      acc.statsCount++;
      acc.soma.chutes += st.totalShots ?? 0;
      acc.soma.chutesNoGol += st.shotsOnTarget ?? 0;
      acc.soma.escanteios += st.wonCorners ?? 0;
      acc.soma.faltas += st.foulsCommitted ?? 0;
      acc.soma.impedimentos += st.offsides ?? 0;
      acc.soma.amarelos += st.yellowCards ?? 0;
      acc.soma.vermelhos += st.redCards ?? 0;
      acc.soma.posse += st.possessionPct ?? 0;
      acc.soma.defesasGoleiro += st.saves ?? 0;
      acc.soma.desarmes += st.totalTackles ?? 0;
    }

    // eventos (gols e cartões) com minuto
    const eventosRaw = [];
    for (const ke of sum?.keyEvents ?? []) {
      const tipo = ke.type?.text ?? "";
      const periodo = ke.period?.number ?? 0;
      if (periodo >= 5) continue; // disputa de pênaltis não conta
      const min = minutoDe(ke.clock?.displayValue);
      const tempo = periodo === 1 || (periodo === 0 && min <= 45) ? "1T" : "2T";
      const doTime = String(ke.team?.id ?? "") === id;
      const ehGol = ke.type?.type === "goal" || /^Goal|^Penalty - Scored|^Own Goal/.test(tipo);
      const golValido = ehGol && !/Missed|Saved/.test(tipo);
      if (golValido) {
        const ownGoal = /Own Goal/i.test(tipo) || /own goal/i.test(ke.text ?? "");
        // no feed da ESPN o "team" do gol contra é o time do jogador — beneficia o rival
        const golDoTime = ownGoal ? !doTime : doTime;
        const scorer = ke.participants?.[0]?.athlete?.displayName;
        const assist = ke.participants?.[1]?.athlete?.displayName;
        if (golDoTime) {
          acc.golsJanela[janelaDe(min)]++;
          acc.golsTempo[tempo]++;
          if (!ownGoal && scorer) {
            const k = normNome(scorer);
            acc.scorers[k] = acc.scorers[k] || { nome: scorer, gols: 0, penaltis: 0 };
            acc.scorers[k].gols++;
            if (/Penalty/i.test(tipo) || /penalty/i.test(ke.text ?? "")) acc.scorers[k].penaltis++;
          }
          if (!ownGoal && assist) {
            const a = normNome(assist);
            acc.assists[a] = acc.assists[a] || { nome: assist, assistencias: 0 };
            acc.assists[a].assistencias++;
          }
        } else {
          acc.gaJanela[janelaDe(min)]++;
        }
        eventosRaw.push({ tipo, min, periodo, time: ke.team?.displayName, jogador: scorer, assist });
      } else if (tipo === "Yellow Card" && doTime) {
        acc.amarelosJanela[janelaDe(min)]++;
        eventosRaw.push({ tipo, min, periodo, time: ke.team?.displayName, jogador: ke.participants?.[0]?.athlete?.displayName });
      }
    }

    raw.push({ fixture: Number(ev.id), league: ligaNome, date: ev.date, gf, gc, stats: st, eventos: eventosRaw });
  }

  if (!acc.jogos) {
    console.warn(`  ✗ ${team.fifa}: nenhum jogo finalizado encontrado.`);
    return;
  }

  const m = acc.statsCount || 1;
  const processed = {
    fifa: team.fifa,
    team: team.name,
    nomePt: PT[team.fifa] ?? team.name,
    espnTeamId: Number(id),
    atualizadoEm: new Date().toISOString(),
    desde: DESDE,
    jogos: acc.jogos,
    competicoes: [...acc.competicoes].filter(Boolean),
    registro: { v: acc.v, e: acc.e, d: acc.d, gp: acc.gp, gc: acc.ga },
    porJogo: {
      chutes: acc.statsCount ? round(acc.soma.chutes / m) : undefined,
      chutesNoGol: acc.statsCount ? round(acc.soma.chutesNoGol / m) : undefined,
      escanteios: acc.statsCount ? round(acc.soma.escanteios / m) : undefined,
      faltas: acc.statsCount ? round(acc.soma.faltas / m) : undefined,
      impedimentos: acc.statsCount ? round(acc.soma.impedimentos / m) : undefined,
      amarelos: acc.statsCount ? round(acc.soma.amarelos / m) : undefined,
      vermelhos: acc.statsCount ? round(acc.soma.vermelhos / m, 2) : undefined,
      posse: acc.statsCount ? round(acc.soma.posse / m) : undefined,
      defesasGoleiro: acc.statsCount ? round(acc.soma.defesasGoleiro / m) : undefined,
      desarmes: acc.statsCount ? round(acc.soma.desarmes / m) : undefined,
      golsPro: round(acc.gp / acc.jogos),
      golsContra: round(acc.ga / acc.jogos),
    },
    golsPorJanela: acc.golsJanela,
    golsContraPorJanela: acc.gaJanela,
    golsPorTempo: acc.golsTempo,
    amarelosPorJanela: acc.amarelosJanela,
    artilheiros: Object.values(acc.scorers).sort((a, b) => b.gols - a.gols).slice(0, 10),
    assistentes: Object.values(acc.assists).sort((a, b) => b.assistencias - a.assistencias).slice(0, 10),
    cobertura: { jogosComStatsDetalhadas: acc.statsCount },
    fontes: ["ESPN"],
  };

  await writeFile(out, JSON.stringify(processed, null, 2));
  await writeFile(path.join(DIR_RAW, `${team.fifa}.json`), JSON.stringify(raw, null, 2));
  console.log(`  ✅ ${team.fifa}: ${acc.jogos} jogos · ${acc.statsCount} com stats · salvo. (${requests} reqs até agora)`);
}

// ---------- main ----------
async function main() {
  await mkdir(DIR_TEAMS, { recursive: true });
  await mkdir(DIR_RAW, { recursive: true });
  await mkdir(DIR_CACHE, { recursive: true });
  await mkdir(FXDIR, { recursive: true });

  console.log("⬇️  Baixando lista de seleções (openfootball)...");
  const teamsResp = await fetch(
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json",
  );
  let teams = await teamsResp.json();
  teams = teams.map((t) => ({ name: t.name, name_normalised: t.name_normalised, fifa: t.fifa_code }));
  if (FILTER) {
    teams = teams
      .filter((t) => FILTER.includes(t.fifa))
      .sort((a, b) => FILTER.indexOf(a.fifa) - FILTER.indexOf(b.fifa));
  }

  console.log("🗂️  Montando índice de times da ESPN...");
  const index = await buildEspnIndex();

  console.log(`🎯 ${teams.length} seleção(ões) · temporadas ${SEASONS.join(",")} · fonte ESPN (sem quota)\n`);
  for (const team of teams) {
    try {
      await processTeam(team, index);
    } catch (err) {
      console.error(`  ❌ ${team.fifa}:`, err.message);
    }
  }
  console.log(`\n🏁 Concluído. ${requests} requisições usadas.`);
}

main();
