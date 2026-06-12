# Prompt — Redesign "Placar Eletrônico v2": landing humanizada + polish do layout

> Cole este prompt inteiro numa sessão do Claude Code no repositório `studoworldcup`.

---

Quero executar o redesign "Placar Eletrônico v2" do StudoWorldCup. A identidade já existe
(tokens em `src/app/globals.css`: âmbar #FFB300 assinatura, azul-aço lado B, verde só
vitória, vermelho só derrota, dourado-claro só placar exato; logomarca "S" dot-matrix em
`src/components/brand.tsx`; fonte display Archivo). O objetivo agora é aplicar essa
identidade com personalidade no layout inteiro, começando pela landing (pré-login),
deixando tudo mais bonito e humanizado. Funcionalidade não muda — é pele, microinteração
e copy. Faça na ordem abaixo, commitando por fase, validando com tsc + lint + build e
testando no dev server antes de cada commit.

## Fase 1 — Landing page nova: "a fachada do estádio" (src/app/page.tsx)

A landing deve parecer um telão de estádio à noite, não um site de software:

1. **Hero vivo com dados reais** (a grande virada): no lugar da ilustração com bola de
   emoji e órbitas, renderizar um PAINEL ELETRÔNICO real usando `getMatches()`:
   - Se tem jogo **ao vivo** agora: placar gigante com nomes/bandeiras + relógio + "AO VIVO" pulsando.
   - Senão: o **próximo jogo** com contagem regressiva em estilo dot-matrix (DD : HH : MM,
     client component atualizando a cada segundo) + bandeiras + estádio/cidade.
   - Moldura tipo letreiro: borda fina âmbar, fundo #0B0D12, números âmbar tabulares enormes.
2. **Letreiro marquee** logo abaixo do hero: faixa horizontal rolando com resultados reais
   dos últimos jogos ("MEX 2×0 RSA · KOR 1×1 CZE · ...") — classe `animate-marquee` já
   existe no globals.css. Conteúdo de `getMatches()` encerrados.
3. **Copy humanizada de torcida** (zero corporativês). Sugestões:
   - H1: "A Copa de 2026 passa por aqui." ou "Seu QG da Copa 2026."
   - Sub: "Placar ao vivo, estatísticas de verdade e o bolão pra zoar os amigos —
     tudo em um lugar só. Chama a família, o pessoal da firma, o grupo do futebol."
   - CTA primário: "Criar meu bolão grátis" (vai para /login). Secundário: "Ver o painel".
4. **Seção Bolão como produto estrela** (hoje a landing nem fala do bolão!):
   - Mini-mock do ranking real (componente estático bonito: 3 linhas com medalhas,
     badges 🎯🔥, pontos âmbar) + os 3 passos: "Crie o grupo → manda o código → palpita".
   - Card com a pontuação: exato 3 pts · resultado 1 pt · campeã +10 · artilheiro +5.
5. **Prova social dinâmica**: contadores reais do banco (se `temBanco()`): "X palpites
   registrados · Y grupos disputando" (consulta count() com cache de 5 min; esconder se 0).
6. **Stats do torneio** (os 4 cards 48/12/16/104): manter, mas com números em fonte mono
   tabular grandona estilo painel e label pequeno em caps espaçado.
7. **Footer de verdade**: marca + "feito por torcedor, para torcedores", links painel/bolão,
   crédito das fontes de dados (ESPN, openfootball, TheSportsDB) e o ano.
8. Remover: bola emoji 3D, órbitas/planetas, qualquer gradiente multicor que sobrou.

## Fase 2 — Microinterações que assinam a marca

1. **Flip de placar (split-flap)**: animação CSS nos números do placar quando mudam
   (componente `<DigitoPlacar valor={n}/>` com transição de virada vertical). Usar no
   hero da landing, no widget LiveScores e na página do jogo.
2. **Loading com letreiro**: componente `<CarregandoPlacar/>` — o "S" dot-matrix com os
   pontos acendendo em sequência (CSS animation-delay escalonado). Usar como `loading.tsx`
   do grupo de rotas do painel.
3. **"AO VIVO" padronizado**: um componente único `<TagAoVivo/>` (ponto vermelho pulsando +
   texto) substituindo as 4+ implementações espalhadas.
4. **Confete âmbar** (CSS puro, sem lib) ao salvar palpites com sucesso na tela de palpites.
5. Hover dos cards: manter o glow âmbar atual; adicionar transição de borda mais visível
   no tema (já há base no .glass-hover).

## Fase 3 — Polish do painel (consistência)

1. **StatCard**: números grandes em mono tabular (estilo painel), ícone menor, label em
   caps espaçado — hoje os cards variam entre páginas.
2. **Tabelas** (ranking do bolão, grupos, artilheiros): cabeçalho sticky no scroll,
   zebra sutil (linhas alternadas rgba branca 2%), colunas numéricas SEMPRE tabular-nums
   alinhadas à direita.
3. **Badge único**: componente `<Chip cor="brand|success|danger|gold|violet|neutro">` para
   unificar os 15+ estilos de chip espalhados (convocado, fora, Copa 26, ao vivo, IA...).
4. **Empty states com personalidade**: o "S" dot-matrix com pontos apagados + frases de
   torcida ("Ninguém palpitou ainda — vai ficar olhando o jogo do sofá?").
5. **Mobile**: barra de navegação inferior fixa com 5 itens (Visão geral, Bolão, Jogos,
   Mata-mata, Mais) em vez de depender só do menu hambúrguer — bolão é uso de celular.
6. Página da seleção: cabeçalho com a bandeira GIGANTE desfocada ao fundo (tipo pôster).

## Fase 4 — OG images dinâmicas (o cartão de visita no WhatsApp)

1. `src/app/opengraph-image.tsx` (ImageResponse do Next): fundo grafite, "S" dot-matrix,
   wordmark, e o próximo jogo com bandeiras — gerada na hora.
2. OG específica do convite do bolão (`/bolao/[codigo]`): "Fulano te convidou para o
   bolão X — entra com o código YYYY" com a marca. É a peça que mais converte no WhatsApp.
3. OG da página do jogo: placar + bandeiras (compartilhar resultado fica lindo).

## Fase 5 — Acessibilidade e acabamento

1. Contraste: âmbar #FFB300 sobre grafite passa AA para texto grande/bold; para texto
   pequeno âmbar usar #FFC94D. Revisar chips e labels pequenos.
2. Focus ring âmbar visível em TODOS os interativos (inputs do palpite, botões, links).
3. `prefers-reduced-motion` já existe — garantir que flip/confete/marquee respeitam.
4. Title/description por página (generateMetadata) com tom da marca.

## Critérios de aceite

- Landing sem nenhum elemento de template (bola emoji, órbitas, gradiente multicor).
- Hero mostra dado REAL (jogo ao vivo ou countdown) — nunca ilustração estática.
- Zero hexadecimais fora dos tokens (`grep -rn "#" src --include="*.tsx"` só pode achar
  os tokens documentados e cores de gráfico da paleta v3).
- Lighthouse da landing ≥ 90 em performance e acessibilidade.
- tsc, eslint e build limpos; commits por fase com mensagens em PT.

Estilo de trabalho: pode commitar e pushar direto na main a cada fase concluída.
