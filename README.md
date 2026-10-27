# MyBooks

Uma rede social de leitura minimalista: monte sua estante, organize coleções, visite a estante de outros leitores e veja qualquer livro em 3D.

- O que construir: [SPEC.md](SPEC.md)
- Arquitetura e versões: [docs/superpowers/plans](docs/superpowers/plans)
- Convenções do projeto: [CLAUDE.md](CLAUDE.md)

## Rodando

Requer Node 24 e um projeto no [Supabase](https://supabase.com).

```bash
npm install
cp .env.example .env.local
```

Preencha o `.env.local` (cada variável está explicada no `.env.example`) e prepare o banco:

```bash
npm run db:link                # uma vez: liga a CLI ao projeto
npm run db:seed -- --yes       # migrations e o seed (8 leitores, 44 livros)
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) para criar uma conta, ou [http://localhost:3000/dev](http://localhost:3000/dev) para ver os componentes e as animações.

No painel do Supabase, em Authentication → URL Configuration, o Site URL é `http://localhost:3000` e a lista de redirecionamento tem `http://localhost:3000/**`. O login com Google precisa de um cliente OAuth no Google Cloud com o retorno `https://<seu-projeto>.supabase.co/auth/v1/callback` e do provedor ligado no Supabase.

## Comandos

| Comando              | O que faz                                                |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | servidor de desenvolvimento                              |
| `npm run build`      | build de produção (e confere que o bundle não tem chave) |
| `npm run typecheck`  | gera os tipos das rotas e roda o TypeScript              |
| `npm run lint`       | ESLint                                                   |
| `npm test`           | testes unitários (Vitest)                                |
| `npm run test:db`    | testes de banco (SQL de verdade, desfeito no fim)        |
| `npm run test:e2e`   | testes de ponta a ponta (Playwright)                     |
| `npm run db:push`    | aplica as migrations de `supabase/migrations`            |
| `npm run db:types`   | gera `lib/supabase/database.types.ts`                    |
| `npm run seed:gerar` | refaz o `supabase/seed.sql` (busca na Open Library)      |
| `npm run format`     | formata o código (Prettier)                              |

Antes do primeiro `npm run test:e2e`, instale o navegador dos testes com `npx playwright install chromium`. Os testes de banco e os E2E com conta usam o `SUPABASE_ACCESS_TOKEN` e a `SUPABASE_SECRET_KEY` do `.env.local`.
