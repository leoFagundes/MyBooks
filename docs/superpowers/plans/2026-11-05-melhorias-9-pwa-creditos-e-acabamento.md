# Melhorias, Fase 9: PWA, créditos e acabamento

Branch `melhorias-9-pwa-creditos-e-acabamento`, a partir da `main`. Itens 9.1 a 9.4 do [MELHORIAS.md](../../../MELHORIAS.md).

## Decisões

1. **O manifest (9.1)** fica em `app/manifest.ts`: nome, `standalone`, `start_url` em `/`, atalhos para Explorar e Comunidade, ícones (192, 512 e maskable) e as capturas estreita e larga.
   - O manifest só aceita uma cor de tema. As duas (clara e escura) vão no `viewport` do layout raiz, lidas do `globals.css` (`themeColors`, em `lib/og/theme.ts`).
   - Quem escolhe o tema à mão também muda a barra do sistema: `applyTheme` reescreve as metas `theme-color` com o `--background` atual.
2. **Ícones e telas de abertura** saem do `npm run pwa:icones` (`scripts/gerar-icones.tsx`, com o `next/og` e as fontes do projeto):
   - as três lombadas do logo, invertidas como o botão primário;
   - 14 telas de abertura de iPhone e iPad, nos dois temas;
   - a lista de aparelhos, em `features/pwa/splash-screens.json`, monta as tags da Apple no layout.
   - As capturas vêm do `npm run pwa:capturas` (`/@ana` no celular e `/explorar` larga).
3. **O service worker é do Serwist, gerado no fim do build.**
   - O `@serwist/turbopack` monta o arquivo num Route Handler `force-static`, que não convive com o Cache Components. Na Vercel, ele rodaria o esbuild a cada pedido.
   - No lugar dele, o `scripts/gerar-sw.mjs` (no `postbuild`) empacota `features/pwa/worker/sw.ts` com o esbuild e grava a lista do precache com o `@serwist/build`, em `public/sw.js` (fora do git).
   - O worker tem um tsconfig próprio (lib `webworker`), conferido pelo `npm run typecheck`.
4. **O que o service worker guarda:**
   - no precache, a página `/sem-conexao`, os estilos e as fontes, para a página offline se desenhar mesmo sem o JavaScript;
   - os scripts do build, conforme são usados (CacheFirst; o nome tem hash).
   - As páginas vêm sempre da rede: elas carregam a sessão, e num aparelho dividido uma conta não pode aparecer para a outra. Sem rede, entra a página offline.
   - Ele só é registrado em produção.
   - O `sw.js` sai sem cache (`next.config.ts`) e fora do proxy, para o modo manutenção não trocá-lo por HTML.
5. **Instalar o app.** `features/pwa/lib/install.ts` guarda o `beforeinstallprompt` desde que o módulo carrega e expõe `useInstallApp()` e `installApp()`.
   - No Chrome e no Edge, abre o diálogo do navegador.
   - No iPhone e no iPad, abre o passo a passo ilustrado (Compartilhar, Adicionar à Tela de Início, Adicionar).
   - Com o app instalado, o botão de Configurações some.
   - No celular, um aviso discreto aparece uma única vez, depois de 20s, fora da landing, da conta e do onboarding.
6. **Ajustes de app:**
   - `viewport-fit=cover` com as safe areas no corpo e nas duas barras;
   - campos com 16px no toque, para o iOS não dar zoom (o zoom da pessoa continua livre);
   - o ícone e as telas de abertura da Apple.
7. **Créditos (9.2)** em `/readme`.
   - A página mostra as fontes dos livros (Open Library e Google Books), os serviços, as letras, os ícones e as bibliotecas.
   - A lista de bibliotecas vem do `scripts/gerar-creditos.mjs` (no `prebuild`): só o nome, a licença e o link, sem versões.
   - Nada de rotas internas, tabelas, variáveis ou endpoints.
   - O Dependabot (`.github/dependabot.yml`) abre um PR por semana com as atualizações menores juntas. O TypeScript e o ESLint ficam presos na versão maior atual.
8. **Termos e privacidade (9.3)** em `/termos` e `/privacidade`, como rascunho (LGPD, Marco Civil e direitos autorais).
   - Os trechos a revisar estão no `<ToReview>` (`components/ui/prose.tsx`), marcados com tracejado só no dev: quem responde pelo serviço, o contato, a idade mínima, a região dos dados, o prazo de resposta, o limite de responsabilidade, o foro e a data.
   - Os links ficam no rodapé, no cadastro e no sitemap. A tela de consentimento do Google está no `docs/deploy.md`.
9. **QA (9.4):**
   - a auditoria de responsividade com as páginas novas: comunidade, tópico, sugestões, sugestão, créditos, termos, privacidade, sem conexão e o painel inteiro, com uma conta de equipe;
   - `tests/db/community-policies.test.ts`, que confere que o leitor comum não escreve no nome dos outros, não mexe no status, na moderação nem nos contadores, não vê denúncias, sanções, avisos e preferências alheios e não vira equipe;
   - os E2E `community.spec.ts` (tópico com títulos, resposta e curtida; sugestão e voto; denúncia e moderação) e `pwa.spec.ts` (manifest e ícones, página offline, o diálogo do Chrome, o passo a passo do iPhone e o botão que some com o app instalado);
   - uma sonda no build de produção: o service worker assume, a página offline aparece sem rede, e o "Tentar de novo" volta;
   - o Lighthouse nas páginas novas.
