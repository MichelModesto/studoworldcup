/** Traduções e normalizações PT-BR para os dados da API (openfootball). */

export const TEAMS_PT: Record<string, string> = {
  Mexico: "México",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  "Czech Republic": "Tchéquia",
  Canada: "Canadá",
  "Bosnia & Herzegovina": "Bósnia e Herzegovina",
  Qatar: "Catar",
  Switzerland: "Suíça",
  Brazil: "Brasil",
  Morocco: "Marrocos",
  Haiti: "Haiti",
  Scotland: "Escócia",
  USA: "Estados Unidos",
  Paraguay: "Paraguai",
  Australia: "Austrália",
  Turkey: "Turquia",
  Germany: "Alemanha",
  "Curaçao": "Curaçao",
  "Ivory Coast": "Costa do Marfim",
  Ecuador: "Equador",
  Netherlands: "Holanda",
  Japan: "Japão",
  Sweden: "Suécia",
  Tunisia: "Tunísia",
  Belgium: "Bélgica",
  Egypt: "Egito",
  Iran: "Irã",
  "New Zealand": "Nova Zelândia",
  Spain: "Espanha",
  "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arábia Saudita",
  Uruguay: "Uruguai",
  France: "França",
  Senegal: "Senegal",
  Iraq: "Iraque",
  Norway: "Noruega",
  Argentina: "Argentina",
  Algeria: "Argélia",
  Austria: "Áustria",
  Jordan: "Jordânia",
  Portugal: "Portugal",
  "DR Congo": "RD Congo",
  Uzbekistan: "Uzbequistão",
  Colombia: "Colômbia",
  England: "Inglaterra",
  Croatia: "Croácia",
  Ghana: "Gana",
  Panama: "Panamá",
};

export function ptTeam(name: string, fallback?: string): string {
  return TEAMS_PT[name] ?? fallback ?? name;
}

const CITY_PT: Record<string, string> = {
  "Mexico City": "Cidade do México",
  Guadalajara: "Guadalajara",
  Monterrey: "Monterrey",
  Toronto: "Toronto",
  Vancouver: "Vancouver",
  Seattle: "Seattle",
  "San Francisco Bay Area": "São Francisco (Bay Area)",
  "Los Angeles": "Los Angeles",
  Atlanta: "Atlanta",
  Dallas: "Dallas",
  Houston: "Houston",
  "Kansas City": "Kansas City",
  Philadelphia: "Filadélfia",
  Miami: "Miami",
  "New York New Jersey": "Nova York / Nova Jersey",
  Boston: "Boston",
};

/** Remove parênteses ("Dallas (Arlington)" -> "Dallas") e traduz a cidade. */
export function cidadePt(raw: string): string {
  const base = raw.replace(/\s*\(.*\)\s*/g, "").trim();
  return CITY_PT[base] ?? CITY_PT[raw] ?? base;
}

/** Chave para casar cidade do jogo com a cidade do estádio. */
export function cityKey(raw: string): string {
  return raw.replace(/\s*\(.*\)\s*/g, "").trim().toLowerCase();
}

export function paisFromCc(cc: string): string {
  const m: Record<string, string> = {
    ca: "Canadá",
    us: "Estados Unidos",
    mx: "México",
  };
  return m[cc.toLowerCase()] ?? cc.toUpperCase();
}

/** Mapeia o "round" bruto da API para a fase em PT-BR. */
export function faseFromRound(round: string): string {
  const r = round.toLowerCase();
  if (r.includes("matchday") || r.includes("group")) return "Fase de Grupos";
  if (r.includes("round of 32") || r.includes("32")) return "16-avos de final";
  if (r.includes("round of 16") || r.includes("last 16") || r.includes("16"))
    return "Oitavas de final";
  if (r.includes("quarter")) return "Quartas de final";
  if (r.includes("semi")) return "Semifinal";
  if (r.includes("third") || r.includes("3rd")) return "Disputa de 3º lugar";
  if (r.includes("final")) return "Final";
  return round;
}
