# Fase 1 · Fundação: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar pronta a base visual e de movimento do MyBooks (tokens, fontes, tema, primitivos shadcn restilizados, presets de movimento, Lenis, navegação, BookCover, BookSpine e Shelf), com uma página `/dev` que mostra tudo funcionando.

**Architecture:** Tokens CSS no `@theme` do Tailwind 4.3, com a paleta padrão desligada. O tema é próprio: script inline no `<head>` mais um `ThemeProvider` com `useSyncExternalStore`. Todo movimento sai de `lib/motion.ts` (Motion 14) e o Lenis roda guiado pelo `frame` do Motion. Os overlays usam Radix e entram com Motion. As capas usam `next/image` com loader global próprio.

**Tech Stack:** Next 16.4.3, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.3, Motion 14.6.0, Lenis 1.3.27, shadcn 4.22.1 (`--base radix`), radix-ui 1.8.1, cmdk 1.1.1, sonner 2.0.8, @number-flow/react 0.6.2, lucide-react 1.61.0, Vitest 5.0.5, Playwright 1.64.1.

**Spec:** [SPEC.md](../../../SPEC.md) (§2, §3, §4, §8) · Arquitetura aprovada: [Fase 0](2026-10-24-fase-0-arquitetura.md) · Convenções: [CLAUDE.md](../../../CLAUDE.md)

## Global Constraints

- Claro: fundo `#FAFAF8` · superfície `#FFFFFF` · borda `#EAEAE6` · texto `#111110` · secundário `#6E6E69` · acento `#D9541E`. Escuro: `#0B0B0A` · `#141413` · `#22221F` · `#EDEDEA` · `#8B8B86` · `#F07040`. `--border-strong`: `#8F8F8A` / `#66665F` (proposta 5 aprovada).
- Nenhuma cor solta em `.ts`/`.tsx` (fora fixtures de dados): só tokens. Paleta padrão do Tailwind desligada.
- Botão primário invertido (preto no claro, branco no escuro). Bordas 1px, quase sem sombra, sem gradiente decorativo.
- Fontes: Instrument Serif (títulos de páginas e livros), Geist Sans (interface), Geist Mono (metadados).
- Raios: 10px controles, 14px cards, 3px capas. Grade 4/8px. Ícones lucide com traço 1.5.
- Molas: `snappy` (bounce 0, visualDuration 0.2), `smooth` (0.15, 0.4), `gentle` (0.25, 0.6). Curva `[0.22, 1, 0.36, 1]`; 150/250/400ms; sequência de 35ms.
- `<MotionConfig reducedMotion="user">` na raiz; versão reduzida = só opacidade.
- Anima só transform/opacity (filter com moderação); tamanho/posição com `layout`.
- Entradas: fade + 8px para cima + blur 4px→0, 35ms entre itens, só na primeira vez.
- Capa: tilt seguindo o cursor (useMotionValue + useSpring, até 6°) + reflexo suave. Lombada: sai alguns pixels e as vizinhas se afastam.
- Botões: scale 0.97 ao clicar; textos que mudam usam AnimatePresence `mode="popLayout"`.
- Modais, drawers e paleta: entram com escala 0.96→1 + fade, saem mais rápido que entram.
- Interface 100% pt-BR, sem lorem ipsum. Responsivo de 360px a 1920px.

## Review Focus

1. **Tema errado ou piscando:** preferência salva `dark` precisa valer antes do React carregar; trocar e recarregar mantém a escolha. Teste na Task 4 (`e2e/theme.spec.ts`, com os chunks JS bloqueados).
2. **Movimento reduzido:** tudo vira só opacidade, o Lenis não liga e a capa não inclina. Testes: `entranceVariants(true)` (Task 2) e `e2e/motion.spec.ts` com `reducedMotion: "reduce"` (Task 6).
3. **Capa ausente ou quebrada:** `coverUrl` nulo ou que falha cai na capa tipográfica. Teste na Task 8 (`e2e/books.spec.ts`).
4. **Dados extremos:** título longo, acentuado ou vazio; `pageCount` nulo, 0 ou 5000. A lombada respeita os limites e o texto não vaza. Testes de `spineWidth`/`spineHeight`/`generatedCoverColor` (Task 8).
5. **Teclado:** overlays fecham com Esc e devolvem o foco; o controle segmentado anda com as setas; lombadas recebem foco visível e levantam como no hover. Testes em `e2e/components.spec.ts` (Task 5) e `e2e/books.spec.ts` (Task 8).

---

### Task 1: Base do projeto

**Files:**

- Modify: `package.json`, `next.config.ts`, `.gitignore`, `eslint.config.mjs`, `README.md`
- Create: `.prettierrc.json`, `.prettierignore`, `vitest.config.mts`, `playwright.config.ts`, `.env.example`

**Interfaces:**

- Produces: scripts `typecheck` (`next typegen && tsc --noEmit`), `test` (`vitest run`), `test:e2e` (`playwright test`), `format`, `format:check`; `engines.node` `"24.x"`.

Configuração pura (exceção de TDD para arquivos de configuração); a prova é o ferramental rodando.

- [ ] **Step 1:** Instalar com versões exatas (`-E`): react/react-dom 19.3.1, motion 14.6.0, lenis 1.3.27, lucide-react 1.61.0, sonner 2.0.8, @number-flow/react 0.6.2, cmdk 1.1.1, clsx 2.1.1, tailwind-merge 3.7.0, class-variance-authority 0.7.1, radix-ui 1.8.1; dev: typescript 6.0.3, @types/node 24.19.2, prettier 3.9.10, prettier-plugin-tailwindcss 0.8.1, vitest 5.0.5, @playwright/test 1.64.1, babel-plugin-react-compiler 1.0.0. `npx playwright install chromium`.
- [ ] **Step 2:** `next.config.ts`: remover `experimental.agentFeedback`, ligar `reactCompiler: true` e `typedRoutes: true`, manter `cacheComponents`, `partialPrefetching` e a regra do `@tailwindcss/turbopack`.
- [ ] **Step 3:** Prettier com `prettier-plugin-tailwindcss` (`tailwindStylesheet: "./app/globals.css"`, `tailwindFunctions: ["cn", "cva"]`); ignorar `.next`, `SPEC.md`, `package-lock.json`, `.superpowers`, relatórios do Playwright.
- [ ] **Step 4:** Vitest (ambiente `node`, `**/*.test.ts`, alias `@` → raiz, excluir `e2e/`). Playwright (`e2e/`, baseURL `http://localhost:3000`, `webServer: npm run dev` com `reuseExistingServer`, projetos `desktop` e `mobile` (Pixel 7), `locale: "pt-BR"`).
- [ ] **Step 5:** `.gitignore` com `!.env.example` e as pastas do Playwright; `.env.example` com `NEXT_PUBLIC_SITE_URL`; README curto em pt-BR.
- [ ] **Step 6:** Rodar `npm run typecheck`, `npm run lint`, `npx vitest run --passWithNoTests` e `npm run build`. Expected: todos com exit 0.
- [ ] **Step 7:** Commit `chore: base da fase 1 (TS 6, Node 24, Prettier, Vitest, Playwright, React Compiler)`.

### Task 2: Presets de movimento

**Files:**

- Create: `lib/motion.ts`, `lib/motion.test.ts`

**Interfaces:**

- Produces: `springs.{snappy,smooth,gentle}: Transition`; `easing: readonly [0.22, 1, 0.36, 1]`; `durations: { fast: 0.15, base: 0.25, slow: 0.4 }`; `tweens.{fast,base,slow}: Transition`; `staggerDelay = 0.035`; `pressScale = 0.97`; `entranceVariants(reduced: boolean): Variants` (`hidden`/`visible`); `overlayVariants(reduced: boolean): Variants` (`hidden`/`visible`/`exit`, transições embutidas); `sheetVariants(side: "bottom" | "right", reduced: boolean): Variants`.

- [ ] **Step 1: Testes** em `lib/motion.test.ts`:
  - `springs` iguais à spec (`{ type: "spring", bounce: 0, visualDuration: 0.2 }`, etc.);
  - `easing` igual a `[0.22, 1, 0.36, 1]`;
  - `durations` iguais a 0.15/0.25/0.4 e `staggerDelay` igual a 0.035;
  - `entranceVariants(false).hidden` igual a `{ opacity: 0, y: 8, filter: "blur(4px)" }` e `visible` igual a `{ opacity: 1, y: 0, filter: "blur(0px)" }`;
  - `entranceVariants(true)` só com opacidade;
  - `overlayVariants(false).hidden.scale === 0.96`, e a duração da saída é menor que o `visualDuration` da entrada;
  - `overlayVariants(true)` sem `scale`;
  - `sheetVariants("bottom", false).hidden.y === "100%"`.
- [ ] **Step 2:** `npx vitest run lib/motion.test.ts`. Expected: FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `lib/motion.ts`.
- [ ] **Step 4:** Rodar de novo. Expected: PASS.
- [ ] **Step 5:** Commit `feat(movimento): presets de molas, curvas e variantes`.

### Task 3: Tokens, fontes e layout raiz

**Files:**

- Run: `npx shadcn@4.22.1 init` (base radix) e depois reescrever o CSS gerado
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `lib/fonts.ts`, `app/(marketing)/page.tsx` (substitui `app/page.tsx`), `app/not-found.tsx`, `tests/design-rules.test.ts`
- Delete: `app/page.tsx`, SVGs do scaffold em `public/`

**Interfaces:**

- Consumes: `easing`, `durations` (Task 2), espelhados no CSS.
- Produces: variáveis `--background --surface --border --border-strong --foreground --muted-foreground --brand --ink --paper` e as derivadas do shadcn (`--muted --card --popover --primary --secondary --accent --destructive --input --ring --overlay`); utilitários `bg-background`, `bg-surface`, `text-muted-foreground`, `text-brand`, `border-border-strong`, `text-ink`, `text-paper`, `rounded-control` (10px), `rounded-card` (14px), `rounded-cover` (3px), `font-serif`/`font-sans`/`font-mono`; `--ease-standard`, `--duration-fast|base|slow`; variante `dark` por `[data-theme="dark"]`; `lib/utils.ts#cn` (shadcn).

- [ ] **Step 1: Testes** em `tests/design-rules.test.ts`:
  - nenhum hex, `rgb()`, `hsl()` ou `oklch()` literal em `.ts`/`.tsx` de `app/ components/ features/ lib/`, fora testes e `features/books/sample-books.ts`;
  - nenhuma classe da paleta padrão do Tailwind (`zinc-50`, `black/[.06]`, etc.);
  - `globals.css` tem os 7 hex da spec em `:root` e os 7 do escuro em `[data-theme="dark"]`;
  - o CSS contém `--color-*: initial`;
  - `--ease-standard` e as durações do CSS batem com `easing` e `durations` de `lib/motion.ts`.
- [ ] **Step 2:** `npx vitest run tests/design-rules.test.ts`. Expected: FAIL (o `app/page.tsx` do scaffold usa `zinc` e `#383838`; faltam os tokens).
- [ ] **Step 3:** `shadcn init`; reescrever `globals.css` com os tokens; fontes em `lib/fonts.ts`; layout raiz `lang="pt-BR"` com metadata em pt-BR; landing provisória com a frase da spec; `not-found.tsx` em pt-BR.
- [ ] **Step 4:** Rodar o teste de novo. Expected: PASS. Depois, `npm run typecheck` e `npm run build`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat(design): tokens, fontes e layout raiz`.

### Task 4: Tema claro/escuro

**Files:**

- Create: `lib/theme.ts`, `lib/theme.test.ts`, `components/shell/theme-script.tsx`, `components/shell/theme-provider.tsx`, `components/shell/theme-toggle.tsx`, `components/shell/providers.tsx`, `app/(app)/layout.tsx`, `app/(app)/dev/page.tsx` (casca), `e2e/theme.spec.ts`
- Modify: `app/layout.tsx`, `app/globals.css`

**Interfaces:**

- Produces:
  - `ThemePreference = "light" | "dark" | "system"`, `ResolvedTheme`, `THEME_STORAGE_KEY = "mybooks:tema"`;
  - `parseThemePreference(value: unknown): ThemePreference` (inválido vira `"system"`) e `resolveTheme(pref, systemPrefersDark): ResolvedTheme`;
  - `themeInitScript: string` (IIFE autocontida);
  - `useTheme(): { preference, resolved, setPreference }`, `<ThemeToggle />` e `<ThemeSelect />` (Claro · Escuro · Sistema).

- [ ] **Step 1: Testes** em `lib/theme.test.ts`:
  - `parseThemePreference` aceita os 3 valores e rejeita `"azul"`, `null` e `undefined`;
  - `resolveTheme("system", true) === "dark"`;
  - `themeInitScript` rodado em `node:vm` com `localStorage` falso (`dark`) aplica `data-theme="dark"` e `colorScheme` `"dark"`;
  - o script sobrevive a um `localStorage` que lança erro.
- [ ] **Step 2: Testes** em `e2e/theme.spec.ts`:
  - com os chunks JS bloqueados e a preferência `dark`, o `<html>` termina com `data-theme="dark"`;
  - o botão de tema alterna e a escolha persiste no reload;
  - em `system` com `colorScheme: "dark"` emulado, o tema fica escuro.
- [ ] **Step 3:** Rodar os dois. Expected: FAIL (módulos e página inexistentes).
- [ ] **Step 4:** Implementar `lib/theme.ts`, o script no `<head>`, o provider com `useSyncExternalStore` (snapshot do servidor `"system"`) e a troca via `document.startViewTransition` + `flushSync` (sem VT quando há movimento reduzido); casca do `/dev` com o `ThemeSelect`; `/dev` dá 404 com `VERCEL_ENV === "production"`.
- [ ] **Step 5:** Rodar de novo. Expected: PASS.
- [ ] **Step 6:** Commit `feat(tema): tema claro/escuro sem flash e com troca suave`.

### Task 5: Primitivos restilizados e Sheet

**Files:**

- Run: `npx shadcn@4.22.1 add button input textarea label dialog popover dropdown-menu tooltip tabs toggle-group skeleton avatar sonner`
- Modify: os arquivos gerados em `components/ui/`
- Create: `components/ui/sheet.tsx`, `components/ui/sheet-gesture.ts`, `components/ui/sheet-gesture.test.ts`, `components/ui/segmented-control.tsx`, `components/ui/kbd.tsx`, `components/ui/empty-state.tsx`, `app/(app)/dev/_components/*`, `e2e/components.spec.ts`

**Interfaces:**

- Consumes: `springs`, `tweens`, `pressScale`, `overlayVariants`, `sheetVariants` (Task 2).
- Produces:
  - `Button`: variants `primary | secondary | outline | ghost`, sizes `sm | md | lg | icon`, `asChild`; encolhe 0.97 com `snappy`;
  - `Dialog*`, `Popover*`, `DropdownMenu*` e `Tooltip*` entram e saem com Motion;
  - `Sheet`/`SheetContent side="bottom" | "right"` com arrastar para fechar;
  - `shouldDismissSheet({ offset, velocity, size }): boolean`;
  - `SegmentedControl<T>({ value, onValueChange, options })` com indicador `layoutId`;
  - `Tabs*` com indicador `layoutId`;
  - `Skeleton` (shimmer);
  - `EmptyState({ illustration, title, description, action })`.

- [ ] **Step 1: Testes** em `sheet-gesture.test.ts`:
  - fecha com offset ≥ 30% do tamanho;
  - fecha com velocidade ≥ 500 na direção de saída;
  - não fecha com pouco offset e velocidade baixa;
  - não fecha com velocidade alta na direção contrária.
- [ ] **Step 2: Testes** em `e2e/components.spec.ts`:
  - o dialog abre, fecha com Esc e o foco volta ao gatilho;
  - o sheet abre e fecha pelo botão Fechar;
  - o controle segmentado muda com seta para a direita (`aria-checked`);
  - a aba troca o painel visível.
- [ ] **Step 3:** Rodar. Expected: FAIL.
- [ ] **Step 4:** Gerar os componentes, restilizar com os tokens, trocar as animações CSS por Motion e montar as seções do `/dev`.
- [ ] **Step 5:** Rodar de novo. Expected: PASS.
- [ ] **Step 6:** Commit `feat(ui): primitivos shadcn restilizados, sheet próprio e estados vazios`.

### Task 6: Componentes de movimento, MotionConfig e Lenis

**Files:**

- Create: `components/motion/reveal.tsx`, `components/motion/stagger.tsx`, `components/motion/text-reveal.tsx`, `components/motion/swap-text.tsx`, `components/motion/split-words.ts`, `components/motion/split-words.test.ts`, `components/shell/smooth-scroll.tsx`, `e2e/motion.spec.ts`
- Modify: `components/shell/providers.tsx`, `app/globals.css` (CSS do Lenis), seções do `/dev`

**Interfaces:**

- Consumes: `entranceVariants`, `staggerDelay`, `springs` (Task 2).
- Produces:
  - `<Reveal>` (entra uma vez, ao aparecer na tela);
  - `<Stagger>` e `<StaggerItem>`;
  - `<TextReveal text as>` (palavra por palavra, saindo do desfoque);
  - `<SwapText>` (AnimatePresence `popLayout`);
  - `splitWords(text): string[]`;
  - `<SmoothScroll>` (Lenis `root`, `autoRaf: false`, `frame.update` do Motion; desligado com movimento reduzido).

- [ ] **Step 1: Testes** em `split-words.test.ts`: separa por espaço, colapsa espaços repetidos, mantém pontuação colada ("estante só." vira `["estante", "só."]`) e devolve `[]` para string vazia.
- [ ] **Step 2: Testes** em `e2e/motion.spec.ts`:
  - com movimento normal, o `<html>` recebe a classe `lenis`;
  - com `reducedMotion: "reduce"` não recebe;
  - os itens da seção Entradas terminam com `opacity: 1`.
- [ ] **Step 3:** Rodar. Expected: FAIL.
- [ ] **Step 4:** Implementar e montar `MotionConfig reducedMotion="user"`, `SmoothScroll` e `Toaster` nos providers.
- [ ] **Step 5:** Rodar de novo. Expected: PASS.
- [ ] **Step 6:** Commit `feat(movimento): entradas, texto revelado, Lenis e MotionConfig`.

### Task 7: Navegação e paleta de comandos

**Files:**

- Create: `lib/routes.ts`, `lib/routes.test.ts`, `components/shell/top-nav.tsx`, `components/shell/bottom-nav.tsx`, `components/shell/nav-link.tsx`, `components/shell/command-palette.tsx`, `components/shell/logo.tsx`, `e2e/nav.spec.ts`
- Modify: `app/(app)/layout.tsx`

**Interfaces:**

- Produces:
  - `routes.home`, `routes.dev`, `routes.inicio`, `routes.explorar` e `routes.entrar` (`Route`);
  - `routes.profile(username)` → `/@username` e `routes.profileTab(username, "colecoes" | "citacoes")`;
  - `routes.book(id)` → `/livro/id` e `routes.collection(id)` → `/colecao/id`;
  - `<TopNav viewer>` e `<BottomNav viewer>` (`viewer: NavViewer | null`, com `NavViewer = { username, displayName, avatarUrl }`);
  - `<CommandPalette>` com atalho ⌘K/Ctrl+K.

- [ ] **Step 1: Testes** em `lib/routes.test.ts`: `profile("ana_l") === "/@ana_l"`, `profileTab("ana", "colecoes") === "/@ana/colecoes"`, `book("abc") === "/livro/abc"`, `collection("x") === "/colecao/x"`.
- [ ] **Step 2: Testes** em `e2e/nav.spec.ts`:
  - Ctrl+K abre a paleta; digitar "tema" filtra; Enter alterna o tema; Esc fecha;
  - no projeto mobile, a pílula inferior aparece e os links centrais da barra superior somem;
  - no desktop, o contrário.
- [ ] **Step 3:** Rodar. Expected: FAIL.
- [ ] **Step 4:** Implementar. Barra superior fina e translúcida, com `viewTransitionName: site-header`: logo à esquerda; Início, Explorar e Minha estante no centro (indicador `layoutId`); ⌘K, +, notificações (popover vazio) e avatar (menu) à direita, ou "Entrar" sem viewer. No celular, a pílula flutuante. O `/dev` mostra também a barra com um viewer de exemplo.
- [ ] **Step 5:** Rodar de novo. Expected: PASS.
- [ ] **Step 6:** Commit `feat(navegacao): barra superior, pílula inferior e paleta de comandos`.

### Task 8: Capas, lombadas e prateleira

**Files:**

- Create: `features/books/types.ts`, `features/books/lib/hash.ts`, `features/books/lib/spine.ts`, `features/books/lib/color.ts`, os `*.test.ts` deles, `lib/image-loader.ts`, `lib/image-loader.test.ts`, `features/books/components/book-cover.tsx`, `features/books/components/book-spine.tsx`, `features/books/components/shelf.tsx`, `features/books/sample-books.ts`, `e2e/books.spec.ts`
- Modify: `next.config.ts` (`images.loader: "custom"`, `loaderFile`), `app/globals.css` (dobra, reflexo, linhas da prateleira), seções do `/dev`

**Interfaces:**

- Produces:
  - `BookVisual = { id, title, authors: string[], coverUrl: string | null, coverColor: string | null, pageCount: number | null, publishedYear: number | null }`;
  - `hashString(s): number` (FNV-1a 32 bits, sem sinal);
  - `spineWidth(pageCount)`: 16 + 0,05 × páginas, limitado entre 18 e 56; `null` ou ≤ 0 vira 280 páginas → 30;
  - `spineHeight(id)`: 160 + (hash % 9) × 4, entre 160 e 192;
  - `relativeLuminance(hex)` (WCAG), `pickInk(hex): "ink" | "paper"` (`"ink"` quando a luminância > 0,179) e `hslToHex(h, s, l)`;
  - `generatedCoverColor(title)`: matiz do hash, saturação 32%, luminosidade 38%; `bookColor(book)` usa `coverColor` ou `generatedCoverColor`;
  - `imageLoader({ src, width })`: capas da Open Library `-S/-M/-L` escolhidas pela largura (≤ 64 → S, ≤ 320 → M, senão L); o resto passa direto;
  - `<BookCover book size tilt priority>`, `<BookSpine book>` e `<Shelf books>`.

- [ ] **Step 1: Testes**:
  - `spineWidth`: `null` → 30, 0 → 30, 100 → 21, 300 → 31, 5000 → 56;
  - `spineHeight`: determinístico, sempre entre 160 e 192 e múltiplo de 4, para 200 ids;
  - `hashString("")` estável;
  - `relativeLuminance("#ffffff") === 1` e `relativeLuminance("#000000") === 0`;
  - `pickInk("#f5e6c8") === "ink"` e `pickInk("#1f2a44") === "paper"`;
  - `generatedCoverColor` determinístico para títulos com acento, devolve hex válido e escolhe tinta com contraste ≥ 4,5;
  - `imageLoader` faz o mapeamento S/M/L e preserva URLs que não são da Open Library.
- [ ] **Step 2: Testes** em `e2e/books.spec.ts`:
  - um livro sem `coverUrl` mostra a capa tipográfica com o título;
  - uma capa com URL quebrada cai na tipográfica;
  - a prateleira renderiza uma lombada por livro;
  - Tab foca uma lombada, que ganha `data-lifted="true"`.
- [ ] **Step 3:** Rodar. Expected: FAIL.
- [ ] **Step 4:** Implementar os utilitários e os componentes. A fixture de livros reais vem da Open Library (uma vez, ≤ 1 req/s), com a cor dominante calculada pelo sharp.
  - Capa: proporção 2:3, dobra na borda esquerda, tilt de até 6° só com `hover: hover`, e sem tilt com movimento reduzido.
  - Lombada: título vertical de cima para baixo (ABNT).
  - Prateleira: linhas finas por fileira; as vizinhas da mesma fileira se afastam 6/4/2px.
- [ ] **Step 5:** Rodar de novo. Expected: PASS.
- [ ] **Step 6:** Commit `feat(livros): BookCover, BookSpine e Shelf`.

### Task 9: Vitrine completa no /dev

**Files:**

- Create: `features/shelf/components/shelf-views.tsx`, `e2e/dev.spec.ts`
- Modify: seções do `/dev`

**Interfaces:**

- Consumes: Tasks 3 a 8.
- Produces: `<ShelfViews books view>` (`view: "estante" | "grade" | "lista"`), em que Grade↔Lista morfa as capas por `layoutId`.

- [ ] **Step 1: Testes** em `e2e/dev.spec.ts`:
  - `/dev` e `/` carregam sem erro de console nem de página;
  - trocar para Grade mostra as capas e Lista mostra a tabela;
  - "Copiar livro" mostra o toast "Na sua estante" com a ação "Desfazer";
  - o contador NumberFlow muda ao clicar em "+1".
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar `ShelfViews` e as seções restantes (cores, tipografia, botões, campos, overlays, abas, segmentado, entradas, texto, números, toasts, skeletons, vazios, capas, lombadas, prateleira, visualizações).
- [ ] **Step 4:** Rodar de novo. Expected: PASS.
- [ ] **Step 5:** Commit `feat(dev): vitrine de componentes e animações`.

### Task 10: Fechamento da fase

**Files:**

- Modify: `CLAUDE.md` (Estado e comandos), `README.md` se preciso

- [ ] **Step 1:** Rodar `npm run typecheck && npm run lint && npm test && npm run test:e2e && npm run build`. Expected: tudo com exit 0.
- [ ] **Step 2:** Capturas do `/dev` (claro, escuro, 375px e 1440px) para a revisão visual.
- [ ] **Step 3:** Atualizar o CLAUDE.md e fazer o commit `docs: estado da fase 1`.
