# 🏆 StudoWorldCup

Plataforma de **estatísticas e análises da Copa do Mundo FIFA 2026** (México · Canadá · Estados Unidos).

🔗 **Demo ao vivo:** https://studoworldcup.vercel.app — login `admin@studoworldcup.com` / senha `copa2026`

Site com área pública (landing) e um **painel protegido por login** com várias telas: visão geral, **bolão com grupos e palpites**, seleções, jogos, grupos, artilheiros, estatísticas e sedes.

## 🎲 Bolão

Cada pessoa cria a própria conta, monta um **grupo com código de convite** (6 caracteres) e todo mundo palpita nos 104 jogos. Pontuação: **placar exato = 3 pts**, acertou só o vencedor/empate = **1 pt**. Palpites travam no apito inicial e o ranking atualiza sozinho conforme os jogos terminam.

Para ativar é preciso de um Postgres gratuito (**Neon**):

1. No painel da Vercel: **Storage → Create Database → Neon** (plano free) e conecte ao projeto — a `DATABASE_URL` entra sozinha nas variáveis de ambiente.
2. Em **Settings → Environment Variables**, crie também `AUTH_SECRET` (gere com `openssl rand -hex 32`).
3. Local: copie `DATABASE_URL` e `AUTH_SECRET` para `.env.local` e rode `npm run db:init` (cria as tabelas; é idempotente).
4. Redeploy. Sem `DATABASE_URL` o site continua no ar em modo demo (sem bolão).

## ✨ Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Recharts** (gráficos) · **lucide-react** (ícones)
- Autenticação por cookie de sessão + `proxy.ts` (proteção de rotas)

## 🚀 Como rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000

### Acesso de demonstração

- **E-mail:** `admin@studoworldcup.com`
- **Senha:** `copa2026`

## 🗂️ Estrutura

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Tela de login (Server Action)
│   ├── actions.ts            # login / logout
│   └── painel/               # Área protegida
│       ├── layout.tsx        # Shell (sidebar + topbar)
│       ├── page.tsx          # Visão geral
│       ├── selecoes/
│       ├── jogos/
│       ├── grupos/
│       ├── artilheiros/
│       ├── estatisticas/
│       └── sedes/
├── components/               # UI, painel e gráficos
├── lib/
│   ├── auth.ts               # sessão / credenciais
│   └── data/worldcup.ts      # dados (ilustrativos)
└── proxy.ts                  # proteção de rotas (ex-middleware)
```

## 🛣️ Próximos passos (roadmap)

- [ ] Substituir dados ilustrativos por feed/API real
- [ ] Autenticação real (banco de dados / provider)
- [ ] Páginas de detalhe por seleção e por jogo
- [ ] Agentes de IA para insights e previsões
- [ ] Deploy (Vercel / GitHub)

---

> Dados atuais são **ilustrativos** para o escopo inicial e serão substituídos por fontes reais.
