# MyBooks

Uma rede social de leitura minimalista: monte sua estante, organize coleções, visite a estante de outros leitores e veja qualquer livro em 3D.

- O que construir: [SPEC.md](SPEC.md)
- Arquitetura e versões: [docs/superpowers/plans](docs/superpowers/plans)
- Convenções do projeto: [CLAUDE.md](CLAUDE.md)

## Rodando

Requer Node 24.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000/dev](http://localhost:3000/dev) para ver os componentes e as animações.

## Comandos

| Comando             | O que faz                                   |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | servidor de desenvolvimento                 |
| `npm run build`     | build de produção                           |
| `npm run typecheck` | gera os tipos das rotas e roda o TypeScript |
| `npm run lint`      | ESLint                                      |
| `npm test`          | testes unitários (Vitest)                   |
| `npm run test:e2e`  | testes de ponta a ponta (Playwright)        |
| `npm run format`    | formata o código (Prettier)                 |

Antes do primeiro `npm run test:e2e`, instale o navegador dos testes com `npx playwright install chromium`.
