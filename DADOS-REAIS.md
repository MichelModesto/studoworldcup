# 📡 Dados reais das seleções (ingestão)

Os agentes especialistas analisam **dados reais de 2023+** baixados por um script de
ingestão e salvos em `data/teams/<FIFA>.json`. O site lê esse cache (sem chamar a
API em runtime, respeitando o limite gratuito).

## 1. Obter as chaves (grátis)

### API-Football (obrigatória)
1. Crie conta em **https://dashboard.api-football.com** (grátis).
2. Copie sua **API Key**.
3. Cole em `.env.local`:
   ```
   API_FOOTBALL_KEY=sua_chave_aqui
   ```
> Plano free: **100 requisições/dia**. Cobre estatísticas de seleções recentes.

### Live-Score API (opcional — para "tiro de meta")
1. Conta em **https://live-score-api.com** → pegue `key` e `secret`.
2. Em `.env.local`:
   ```
   LIVESCORE_API_KEY=...
   LIVESCORE_API_SECRET=...
   ```
> Enriquecimento experimental; sem isso, a métrica de tiro de meta fica indisponível.

## 2. Rodar a ingestão

Comece **só pela África do Sul** (cabe no limite diário):
```bash
npm run ingest -- --teams=RSA
```

Outras opções:
```bash
npm run ingest -- --teams=RSA,KOR,MEX     # algumas seleções
npm run ingest                            # todas (para ao atingir o orçamento)
npm run ingest -- --max-requests=95 --delay=2200
npm run ingest -- --teams=BRA --force     # refaz uma seleção
```

Características:
- **Resumível:** seleções já baixadas são puladas (use `--force` para refazer).
- **Orçamento:** para automaticamente perto de 100 req/dia; rode de novo no dia seguinte.
- **Custo aprox.:** ~50–70 requisições por seleção (≈ 1 seleção/dia no plano free).

## 3. Ver no site
Abra `/painel/selecoes` e clique numa seleção. O dossiê é montado pelos agentes
a partir do JSON. Sem dados ainda, a tela mostra instruções.

## Cobertura por agente (API-Football)
✅ finalização, chute ao gol, escanteio, cartões, impedimento, falta, artilheiros,
assistências, tempo de gols, médias · ⚠️ desarme (agregado) · ❌ tiro de meta (Live-Score).

> Métricas avançadas (xG/xGOT/xA) exigem plano pago da API-Football — ficam como
> evolução futura.
