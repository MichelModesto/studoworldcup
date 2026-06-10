#!/usr/bin/env bash
# Vigia de retomada: enquanto a API-Football estiver suspensa, espera.
# Quando voltar a ficar ativa, ingere as seleções na ORDEM DA TELA e encerra
# (o término notifica o assistente, que então gera os dossiês dos agentes).
set -u
cd "$(dirname "$0")/.." || exit 1

# Ordem da tela (grupos A→L, alfabético PT dentro do grupo), sem RSA/KOR (já feitas).
ORDER="MEX,CZE,BIH,CAN,QAT,SUI,BRA,SCO,HAI,MAR,AUS,USA,PAR,TUR,GER,CIV,CUW,ECU,NED,JPN,SWE,TUN,BEL,EGY,IRN,NZL,KSA,CPV,ESP,URU,FRA,IRQ,NOR,SEN,ALG,ARG,AUT,JOR,COL,POR,COD,UZB,CRO,GHA,ENG,PAN"

API_KEY=$(grep '^API_FOOTBALL_KEY=' .env.local | head -1 | cut -d= -f2)
CYCLES=11        # ~3h com intervalo de 16 min
INTERVAL=960

for i in $(seq 1 "$CYCLES"); do
  resp=$(curl -s --max-time 20 "https://v3.football.api-sports.io/status" -H "x-apisports-key: $API_KEY")
  if echo "$resp" | grep -qi "suspended"; then
    echo "[$i/$CYCLES] ainda suspensa — aguardando ${INTERVAL}s..."
    sleep "$INTERVAL"
    continue
  fi
  echo "[$i/$CYCLES] API ATIVA! iniciando ingestão na ordem da tela..."
  npm run ingest -- --teams="$ORDER"
  echo "✅ ingestão executada — encerrando vigia para gerar os dossiês."
  exit 0
done
echo "⏱️ janela encerrada (~3h) sem a API voltar. Nada ingerido."
exit 0
