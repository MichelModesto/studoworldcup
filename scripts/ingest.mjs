#!/usr/bin/env node
/**
 * Ingestão de dados reais das seleções (2023+) para o StudoWorldCup.
 *
 * Fontes:
 *  - API-Football (api-sports.io): fixtures, estatísticas por jogo e eventos (gols/cartões).
 *  - Live-Score API (opcional): enriquecimento de "tiro de meta" (experimental).
 *
 * Saída: data/teams/<FIFA>.json (processado, versionado) + data/raw/<FIFA>.json (bruto, ignorado).
 *
 * Uso:
 *   npm run ingest -- --teams=RSA              # só África do Sul (recomendado p/ começar)
 *   npm run ingest -- --teams=RSA,KOR,MEX
 *   npm run ingest                              # todas (respeita o orçamento diário)
 *   npm run ingest -- --seasons=2023,2024,2025 --max-requests=95 --delay=2200 --force
 *
 * Requer Node 22+ (usa --env-file via npm script) e API_FOOTBALL_KEY no .env.local.
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
// Plano Free da API-Football: temporadas 2022–2024 e limite baixo por minuto.
const SEASONS = String(args.seasons ?? "2023,2024").split(",").map(Number);
const MAX_MATCHES = Number(args["max-matches"] ?? 15); // jogos recentes/seleção (~32 req → cabe 3 seleções/dia no free)
const DELAY = Number(args.delay ?? 7000); // ~8/min, abaixo do limite do free
const FORCE = Boolean(args.force);
const FILTER = args.teams ? String(args.teams).toUpperCase().split(",") : null;

// Múltiplas chaves: usa uma até esgotar a quota do dia, então passa para a próxima.
const KEYS = [
  process.env.API_FOOTBALL_KEY,
  process.env.API_FOOTBALL_KEY2,
  process.env.API_FOOTBALL_KEY3,
]
  .filter(Boolean)
  .flatMap((k) => k.split(",").map((x) => x.trim()))
  .filter(Boolean);
const HOST = process.env.API_FOOTBALL_HOST || "v3.football.api-sports.io";
if (!KEYS.length) {
  console.error("\n❌ Nenhuma chave. Preencha API_FOOTBALL_KEY no .env.local (veja .env.example).\n");
  process.exit(1);
}
let keyIndex = args.key ? Math.max(0, Number(args.key) - 1) : 0; // --key=2 começa na 2ª chave
const MAX_REQUESTS = Number(args["max-requests"] ?? 95 * KEYS.length);

const ROOT = process.cwd();
const DIR_TEAMS = path.join(ROOT, "data", "teams");
const DIR_RAW = path.join(ROOT, "data", "raw");
const DIR_CACHE = path.join(ROOT, "data", ".cache");

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

// Ajuste de nomes para casar com a API-Football (edite se algum time não resolver)
const API_NAME = {
  COD: "Congo DR", CPV: "Cape Verde Islands", BIH: "Bosnia and Herzegovina",
  KOR: "South Korea", CIV: "Ivory Coast", IRN: "Iran", USA: "USA", CZE: "Czech Republic",
};

let requests = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(endpoint, params = {}) {
  if (requests >= MAX_REQUESTS) {
    throw new Error(`BUDGET: limite de ${MAX_REQUESTS} requisições atingido.`);
  }
  const qs = new URLSearchParams(params).toString();
  const url = `https://${HOST}/${endpoint}${qs ? `?${qs}` : ""}`;
  requests++;
  await sleep(DELAY);
  const res = await fetch(url, { headers: { "x-apisports-key": KEYS[keyIndex] } });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* resposta não-JSON */ }
  const errStr = JSON.stringify(json.errors ?? json.message ?? "").toLowerCase();
  const limiteDiario =
    errStr.includes("limit for the day") ||
    errStr.includes("request limit") ||
    errStr.includes("requests limit");

  // Quota diária da chave atual esgotou -> tenta a próxima chave.
  if (limiteDiario) {
    if (keyIndex < KEYS.length - 1) {
      keyIndex++;
      console.warn(`  🔑 chave ${keyIndex} esgotada hoje — trocando para a chave ${keyIndex + 1}...`);
      requests--;
      return api(endpoint, params);
    }
    throw new Error("BUDGET: todas as chaves esgotaram a quota diária.");
  }
  // 429 sem ser limite diário = limite por minuto -> espera e repete.
  if (res.status === 429) {
    console.warn("  ⏳ 429 (limite por minuto) — aguardando 60s...");
    await sleep(60000);
    requests--;
    return api(endpoint, params);
  }
  if (json.errors && Object.keys(json.errors).length) {
    console.warn("  ⚠️ API erro:", JSON.stringify(json.errors));
  }
  return json.response ?? [];
}

async function readJSON(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

// Cache por requisição (em data/.cache/fx). Re-rodar não gasta quota.
const FXDIR = path.join(DIR_CACHE, "fx");
async function apiCached(cacheName, endpoint, params) {
  const file = path.join(FXDIR, `${cacheName}.json`);
  const hit = await readJSON(file, null);
  if (hit) return hit;
  const data = await api(endpoint, params);
  await writeFile(file, JSON.stringify(data));
  return data;
}

// ---------- resolução de id da seleção ----------
async function resolveTeamId(team, cache) {
  if (cache[team.fifa]) return cache[team.fifa];
  const candidatos = [API_NAME[team.fifa], team.name, team.name_normalised].filter(Boolean);
  for (const nome of candidatos) {
    const resp = await api("teams", { search: nome });
    const nacional = resp.find((r) => r.team?.national) ?? resp[0];
    if (nacional?.team?.id) {
      cache[team.fifa] = nacional.team.id;
      await writeFile(path.join(DIR_CACHE, "team-ids.json"), JSON.stringify(cache, null, 2));
      console.log(`  ✓ ${team.fifa} -> id ${nacional.team.id} (${nacional.team.name})`);
      return nacional.team.id;
    }
  }
  console.warn(`  ✗ ${team.fifa}: id não resolvido (ajuste API_NAME no script).`);
  return null;
}

// ---------- agregação ----------
const JANELAS = ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90"];
function janelaDe(min) {
  // time.elapsed satura em 45 (1º tempo) e 90 (2º tempo); acréscimos vão em time.extra.
  if (min <= 15) return "0-15";
  if (min <= 30) return "16-30";
  if (min <= 45) return "31-45";
  if (min <= 60) return "46-60";
  if (min <= 75) return "61-75";
  return "76-90";
}
// Chave canônica p/ unir nomes em ordens diferentes ("Lee Kang-In" = "Kang-in Lee").
function normNome(nome) {
  return nome.toLowerCase().replace(/\./g, "").split(/[\s-]+/).filter(Boolean).sort().join(" ");
}
function statVal(stats, tipo) {
  const item = stats.find((s) => s.type === tipo);
  if (!item || item.value == null) return null;
  if (typeof item.value === "string" && item.value.includes("%"))
    return Number(item.value.replace("%", ""));
  return Number(item.value);
}

async function processTeam(team, cache) {
  const out = path.join(DIR_TEAMS, `${team.fifa}.json`);
  if (!FORCE && (await readJSON(out, null))) {
    console.log(`↩︎  ${team.fifa} já existe (use --force para refazer). Pulando.`);
    return;
  }
  console.log(`\n🌍 ${team.fifa} — ${PT[team.fifa] ?? team.name}`);
  const id = await resolveTeamId(team, cache);
  if (!id) return;

  const acc = {
    jogos: 0, gp: 0, ga: 0, v: 0, e: 0, d: 0,
    competicoes: new Set(),
    statsCount: 0,
    soma: { chutes: 0, chutesNoGol: 0, escanteios: 0, faltas: 0, impedimentos: 0, amarelos: 0, vermelhos: 0, posse: 0, defesasGoleiro: 0, desarmes: 0 },
    tackleGames: 0,
    golsJanela: Object.fromEntries(JANELAS.map((j) => [j, 0])),
    gaJanela: Object.fromEntries(JANELAS.map((j) => [j, 0])),
    golsTempo: { "1T": 0, "2T": 0 },
    amarelosJanela: Object.fromEntries(JANELAS.map((j) => [j, 0])),
    scorers: {}, assists: {},
  };
  const raw = [];

  // 1) coleta leve dos fixtures finalizados de todas as temporadas
  let todos = [];
  for (const season of SEASONS) {
    const fixtures = await apiCached(`fixtures-${id}-${season}`, "fixtures", { team: id, season });
    const finalizados = fixtures.filter(
      (f) => f.fixture?.status?.short === "FT" && f.fixture.date >= "2023-01-01",
    );
    console.log(`  • ${season}: ${finalizados.length} jogos finalizados`);
    todos.push(...finalizados);
  }
  // 2) mais recentes primeiro, limita p/ caber no orçamento
  todos.sort((a, b) => b.fixture.date.localeCompare(a.fixture.date));
  const selecionados = todos.slice(0, MAX_MATCHES);
  console.log(`  → analisando os ${selecionados.length} jogos mais recentes (de ${todos.length})`);

  // 3) busca estatísticas + eventos só dos selecionados
  {
    for (const f of selecionados) {
      const ehCasa = f.teams.home.id === id;
      const gf = ehCasa ? f.goals.home : f.goals.away;
      const gc = ehCasa ? f.goals.away : f.goals.home;
      acc.jogos++;
      acc.gp += gf ?? 0; acc.ga += gc ?? 0;
      if (gf > gc) acc.v++; else if (gf < gc) acc.d++; else acc.e++;
      acc.competicoes.add(f.league?.name);

      // estatísticas do jogo
      const stats = await apiCached(`stats-${f.fixture.id}-${id}`, "fixtures/statistics", { fixture: f.fixture.id, team: id });
      const lista = stats[0]?.statistics ?? [];
      if (lista.length) {
        acc.statsCount++;
        acc.soma.chutes += statVal(lista, "Total Shots") ?? 0;
        acc.soma.chutesNoGol += statVal(lista, "Shots on Goal") ?? 0;
        acc.soma.escanteios += statVal(lista, "Corner Kicks") ?? 0;
        acc.soma.faltas += statVal(lista, "Fouls") ?? 0;
        acc.soma.impedimentos += statVal(lista, "Offsides") ?? 0;
        acc.soma.amarelos += statVal(lista, "Yellow Cards") ?? 0;
        acc.soma.vermelhos += statVal(lista, "Red Cards") ?? 0;
        acc.soma.posse += statVal(lista, "Ball Possession") ?? 0;
        acc.soma.defesasGoleiro += statVal(lista, "Goalkeeper Saves") ?? 0;
      }

      // eventos (gols, cartões)
      const eventos = await apiCached(`events-${f.fixture.id}`, "fixtures/events", { fixture: f.fixture.id });
      for (const ev of eventos) {
        const min = ev.time?.elapsed ?? 0;
        const tempo = min <= 45 ? "1T" : "2T";
        if (ev.type === "Goal" && ev.detail !== "Missed Penalty") {
          const ownGoal = ev.detail === "Own Goal";
          const golDoTime = ownGoal ? ev.team?.id !== id : ev.team?.id === id;
          if (golDoTime) {
            acc.golsJanela[janelaDe(min)]++;
            acc.golsTempo[tempo]++;
            if (!ownGoal && ev.player?.name) {
              const k = normNome(ev.player.name);
              acc.scorers[k] = acc.scorers[k] || { nome: ev.player.name, gols: 0, penaltis: 0 };
              acc.scorers[k].gols++;
              if (ev.detail === "Penalty") acc.scorers[k].penaltis++;
            }
            if (!ownGoal && ev.assist?.name) {
              const a = normNome(ev.assist.name);
              acc.assists[a] = acc.assists[a] || { nome: ev.assist.name, assistencias: 0 };
              acc.assists[a].assistencias++;
            }
          } else {
            acc.gaJanela[janelaDe(min)]++;
          }
        } else if (ev.type === "Card" && ev.team?.id === id && ev.detail === "Yellow Card") {
          acc.amarelosJanela[janelaDe(min)]++;
        }
      }

      raw.push({ fixture: f.fixture.id, league: f.league?.name, date: f.fixture.date, gf, gc, stats: lista, eventos });
    }
  }

  if (!acc.jogos) {
    console.warn(`  ✗ ${team.fifa}: nenhum jogo encontrado.`);
    return;
  }

  const m = acc.statsCount || 1;
  const processed = {
    fifa: team.fifa,
    team: team.name,
    nomePt: PT[team.fifa] ?? team.name,
    apiTeamId: id,
    atualizadoEm: new Date().toISOString(),
    desde: "2023-01-01",
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
    fontes: ["API-Football"],
  };

  await writeFile(out, JSON.stringify(processed, null, 2));
  await writeFile(path.join(DIR_RAW, `${team.fifa}.json`), JSON.stringify(raw, null, 2));
  console.log(`  ✅ ${team.fifa}: ${acc.jogos} jogos · ${acc.statsCount} com stats · salvo. (${requests} reqs usadas)`);
}

function round(v, dec = 1) {
  return Math.round(v * 10 ** dec) / 10 ** dec;
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

  console.log(`🎯 ${teams.length} seleção(ões) · temporadas ${SEASONS.join(",")} · ${KEYS.length} chave(s) · começando na chave ${keyIndex + 1} · orçamento ${MAX_REQUESTS} reqs\n`);
  const cache = await readJSON(path.join(DIR_CACHE, "team-ids.json"), {});

  for (const team of teams) {
    try {
      await processTeam(team, cache);
    } catch (err) {
      if (String(err.message).startsWith("BUDGET")) {
        console.log(`\n🛑 ${err.message} Rode novamente amanhã para continuar (é resumível).`);
        break;
      }
      console.error(`  ❌ ${team.fifa}:`, err.message);
    }
  }
  console.log(`\n🏁 Concluído. ${requests} requisições usadas.`);
}

main();
