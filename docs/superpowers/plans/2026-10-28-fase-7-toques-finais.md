# Fase 7 · Toques finais de produto: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O que falta para o MyBooks parecer pronto: a landing contada pela rolagem, o ⌘K completo, sortear a próxima leitura, o scanner de ISBN, imagens de compartilhamento (OG e citação), sitemap, `/configuracoes` com importação do Goodreads, exportação e exclusão de conta.

**Architecture:** Cada entrega usa as peças que já existem. A landing anima componentes do app (`BookCover`, `BookSpine`, `Shelf`, `ProfileHeader`, `ShelfViews`, `CollectionCard`) com `useScroll`/`useTransform` sobre leituras públicas em `'use cache'`. O ⌘K busca por um Route Handler que junta as buscas que já existem (catálogo, leitores, coleções e a estante de quem vê). O sorteio e o scanner são diálogos e passos de cliente, carregados sob demanda. As imagens OG usam as convenções de arquivo do Next (`opengraph-image.tsx`), com fontes TTF lidas do disco. As configurações são uma página só, com Server Actions para escrever e Route Handlers GET para ler e baixar.

**Tech Stack:** Next 16.4.3 (`next/og`, `opengraph-image`, `sitemap`, `robots`), React 19.3.1, Motion 14.6.0 (`useScroll`, `useTransform`), cmdk 1.1.1, @tanstack/react-query 5.105.0, @supabase/ssr 0.12.7, @zxing/browser 0.2.1 e @zxing/library 0.23.0 (reserva do `BarcodeDetector`), radix-ui 1.8.1, sonner 2.0.8, zod 4.6.7.

**Spec:** [SPEC.md](../../../SPEC.md) (§5.1 landing; §5.4 "Sortear próxima leitura"; §5.5 scanner; §5.6 citação como imagem; §5.8 OG da coleção; §5.10 `/configuracoes`; §5.11 ⌘K; §3 momentos 8 e 9; §7 metadados, OG e sitemap; §8) · Arquitetura: [Fase 0](2026-10-24-fase-0-arquitetura.md) · 3D: [Fase 6](2026-10-28-fase-6-visualizador-3d.md)

**Pré-requisito:** Fases 2 a 6 integradas à `master` (28/10/2026).

## Global Constraints

- §5.1: "Topo: frase curta em Instrument Serif ("Sua vida de leitor, em uma estante só.") e o botão "Criar minha estante". Capas reais flutuam soltas em profundidade e reagem de leve ao mouse. Ao rolar, as capas viram lombadas e se encaixam numa prateleira, que então se transforma num perfil de verdade. Três recursos (Organize, Descubra, Compartilhe), cada um com uma mini-demonstração viva feita com os próprios componentes do app. Coleções públicas reais do banco, num carrossel arrastável. Chamada final e rodapé simples. Quem já está logado e acessa `/` vai direto para `/inicio`."
- §3: "Títulos da landing: revelação palavra por palavra, saindo do desfoque." "Lenis em toda a aplicação. Na landing, animações ligadas à rolagem com useScroll e useTransform."
- §5.4: "Em "Quero ler", o botão "Sortear próxima leitura" embaralha as capas como cartas e revela uma delas."
- §5.5: "escanear o código de barras do livro com a câmera do celular"; §1: "BarcodeDetector nativo, com @zxing/browser como alternativa".
- §5.6: "Cada citação pode virar uma imagem para compartilhar (next/og), com a cor da capa." §5.8: "compartilhar (com imagem OG dinâmica)". §7: "Metadados, imagens OG dinâmicas (perfil, coleção, livro e citação) e sitemap das páginas públicas."
- §5.10: "`/configuracoes`: perfil, conta, privacidade, tema, importar biblioteca do Goodreads (CSV), exportar meus dados (CSV ou JSON) e excluir conta."
- §5.11: "Busca global (livros, pessoas, coleções e a sua estante) e ações: Adicionar livro, Nova coleção, Ir para…, Alternar tema e Sortear próxima leitura. Mostre os atalhos de teclado."
- Movimento: só os presets de `lib/motion.ts`; só `transform` e `opacity` (`filter` com moderação); saída mais rápida que a entrada; movimento reduzido: só opacidade.
- Cores só por tokens; nenhum hex nem função de cor em `.ts`/`.tsx` (nas imagens OG também: as cores saem de `INK_RGB`/`PAPER_RGB` e de `bookColor`/`coverInk`).
- Interface 100% pt-BR, foco visível, AA, 360–1920px, estados de carregando, vazio, erro e sucesso. Lighthouse ≥ 90 no celular e LCP < 2,5s na landing.

## Decisões

1. **Configurações numa página só** (`/configuracoes`, protegida pelo proxy), em seções:
   - **Perfil:** um resumo, com o botão que abre o "Editar perfil" que já existe.
   - **Conta:** o e-mail, só para leitura; "Trocar senha" (8 caracteres ou mais, com confirmação, por `supabase.auth.updateUser`); e Sair.
   - **Privacidade:** o mesmo controle "Todos / Só quem eu aprovar" do "Editar perfil", que salva na hora.
   - **Aparência:** o `ThemeSelect`.
   - **Seus dados:** importar e exportar.
   - **Excluir conta.**

   Trocar o e-mail fica de fora: o e-mail padrão do Supabase só chega a quem é da equipe (CLAUDE.md).

2. **Exportar:** `GET /api/account/export?formato=json|csv` devolve um anexo `mybooks-<usuario>-<data>`.
   - **JSON:** tudo o que é da pessoa: perfil, estante (com resenha e datas), citações, coleções com os itens e as notas, quem segue, quem a segue, e as coleções curtidas e salvas.
   - **CSV:** a estante no formato do Goodreads (`Title, Author, Additional Authors, ISBN13, My Rating, Exclusive Shelf, Date Read, Date Added, My Review, Number of Pages, Year Published`), para levar a outros apps.
3. **Excluir conta:** um diálogo pede o @ digitado para confirmar. A action apaga os avatares da pessoa no Storage, apaga o usuário pelo admin (o banco tira o resto em cascata; os livros que ela cadastrou ficam no catálogo, sem o nome dela) e encerra a sessão. O navegador vai para `/?conta=excluida`, e a landing mostra o toast "Sua conta foi excluída. Obrigado pelas leituras."
4. **Goodreads:**
   - **Leitura e prévia:** o CSV é lido no navegador (parser RFC 4180 próprio, sem biblioteca). A prévia conta os livros por status. O limite é de 2.000 livros por arquivo.
   - **Importação:** lotes de 5 por Server Action (elas já vêm uma de cada vez), com barra de progresso, o título da vez e "Parar".
   - **Achar o livro:**
     - pelo ISBN-13 (ou o 10 convertido) no catálogo;
     - senão, pela Open Library com o ISBN;
     - senão, por "título autor", aceitando só um título que bata;
     - senão, um livro manual com os dados do CSV.
   - **Mapeamento dos campos:**
     - Exclusive Shelf: `read` → Lido, `currently-reading` → Lendo, `to-read` → Quero ler, prateleira com "dnf", "did-not-finish" ou "abandon" → Abandonado, o resto → Quero ler.
     - Nota: de 1 a 5, só em Lido e Abandonado.
     - "Date Read" vira o fim da leitura, e "My Review", sem HTML, vira a resenha.
   - **Repetição:** livro que já está na estante fica como está ("já estava"). Importar de novo não duplica nada.
   - **Resumo:** quantos entraram, quantos já estavam e quais não deram certo.
5. **Scanner de ISBN:**
   - **Onde:** um botão "Escanear o código de barras" na busca da paleta de adicionar. Aparece só no toque (`pointer: coarse`) e com câmera disponível (`mediaDevices`, que pede HTTPS).
   - **Passo da câmera:** um passo novo na paleta, com a câmera traseira, uma moldura e "Aponte para o código de barras atrás do livro".
   - **Leitura:** pelo `BarcodeDetector` (EAN-13). Na falta dele (Safari do iOS), pelo `@zxing/browser`, carregado só nessa hora. Vale só EAN-13 que começa com 978 ou 979 e tem dígito verificador certo.
   - **Ao ler:** vibra de leve, desliga a câmera e põe o ISBN na busca.
   - **Busca:** a busca do catálogo passa a achar por ISBN-13 e ISBN-10 quando a consulta é um ISBN.
   - **Erros:** sem permissão, "Sem acesso à câmera. Libere nos ajustes do navegador, ou digite o ISBN".
6. **Sortear a próxima leitura** num diálogo global (`useNextRead().open(livros?)`):
   - **Onde abre:**
     - pelo botão "Sortear próxima leitura" na aba Estante do próprio perfil, com o filtro em Quero ler e pelo menos um livro;
     - pelo ⌘K, que busca a fila em `GET /api/shelf/want`.
   - **O sorteio:**
     - um baralho de até 7 cartas viradas para baixo, com o verso no invertido do botão primário e um ícone de livro;
     - as cartas se dividem em dois montes e se intercalam, duas vezes, com `snappy`;
     - a escolhida sobe e vira (rotateY 180°, `gentle`) mostrando a capa;
     - o título e o autor entram embaixo, e a região `aria-live` anuncia.
   - **A escolha:** uniforme, por `crypto.getRandomValues`, entre todos os livros de Quero ler.
   - **Ações:**
     - "Começar a ler": a action `startReading` muda para Lendo, com início hoje;
     - "Ver o livro";
     - "Sortear de novo": evita repetir o último, se houver outro.
   - **Movimento reduzido:** a carta escolhida aparece de frente, só com opacidade.
   - **Vazio:** "Sua fila de leitura está vazia", com "Procurar um livro".
7. **⌘K completo:**
   - **Busca:** `GET /api/search?q=` devolve `{ shelf, books, readers, collections }`. São no máximo 4 da estante de quem vê (título e autor sem acento), 5 do catálogo (sem os da estante), 4 leitores e 4 coleções públicas. O cliente usa React Query, com debounce de 150ms.
   - **Filtro:** com `shouldFilter={false}`, os comandos fixos são filtrados por um casamento sem acento.
   - **Grupos com busca:** Na sua estante · Livros · Leitores · Coleções · Ações · Ir para.
   - **Grupos sem busca:** Ações e Ir para.
   - **Ações:** Adicionar livro (N), Escanear código de barras (no toque), Nova coleção, Sortear próxima leitura, Alternar tema.
   - **Ir para:**
     - com conta: Início, Explorar, Minha estante, Minhas coleções, Minhas citações, Configurações;
     - sem conta: Explorar, Entrar, Criar conta;
     - Componentes (`/dev`) só fora de produção.
   - **Estados:** carregando, vazio ("Nada com “{q}”") e erro.
8. **Imagens OG** em 1200×630, pela convenção `opengraph-image.tsx`, com as leituras públicas em `'use cache'`:
   - **Raiz:** frase, leque de capas reais e a marca.
   - **Livro:** capa, título em serif, autoria, linha mono e o brilho da cor do livro.
   - **Perfil:** avatar ou iniciais, nome, @, bio, contadores e até 5 capas. Perfil privado: só o nome e "Perfil privado".
   - **Coleção:** emoji, título, "por @dono", número de livros e o leque. Coleção privada: genérica.

   As fontes são TTF estáticas de Instrument Serif (normal e itálico), Geist (400 e 500) e Geist Mono (400), baixadas do Google Fonts para `assets/fonts/`, com o OFL, e lidas do disco no escopo do módulo.

9. **Citação como imagem:**
   - **A imagem:** `GET /api/quotes/[id]/image` gera uma PNG 1080×1350 no fundo `coverInk` do livro, com a citação em serif itálico (o tamanho segue o comprimento), o título, a autoria, "— @usuario · p. 42" e a marca.
   - **Visibilidade:** a leitura é com a sessão, então a RLS decide quem vê; quem não pode ver recebe 404.
   - **O botão:** "Compartilhar como imagem" em cada citação (no bloco da página do livro e na aba Citações). Usa a Web Share com arquivo onde houver; senão, baixa a PNG.
10. **Sitemap e robots.**
    - **Sitemap:** traz `/`, `/explorar`, `/entrar` e `/cadastro`, os livros do catálogo (até 5.000), os perfis públicos e as coleções públicas, em `'use cache'` com `cacheLife("hours")`.
    - **Robots:** libera tudo menos `/api/`, `/dev`, `/inicio`, `/onboarding`, `/configuracoes` e `/auth/`.
11. **Landing:**
    - **Dados:** uma leitura pública em cache escolhe o perfil vitrine, o perfil público com mais livros com capa (no seed, uma das leitoras). Os livros dele são as capas que flutuam.
    - **Palco fixo** de 100vh, dentro de uma seção de 320vh:
      - **Começo:** o título com `TextReveal`, o texto e os botões; em volta, 12 capas (8 no celular) espalhadas em profundidade (escala e desfoque leve pela distância), que reagem ao mouse com `useSpring` `smooth`.
      - **Ao rolar:** o título sai, e cada capa (uma caixa 3D com a capa na frente e a lombada do lado) voa para a prateleira girando 90°, até mostrar a lombada.
      - **A prateleira:** a linha se desenha (`scaleX`), e o `ProfileHeader` de verdade entra por cima com o @ e os contadores. "Ver a estante de @fulana" leva ao perfil.
    - **Organize · Descubra · Compartilhe**, cada um com a sua demonstração:
      - **Organize:** `ShelfViews` com os livros do perfil vitrine, trocando sozinho entre Estante, Grade e Lista enquanto está na tela; o controle também funciona com clique.
      - **Descubra:** a afinidade, com o `AnimatedNumber` subindo até a porcentagem, os avatares e "N livros em comum".
      - **Compartilhe:** um `CollectionCard` de verdade, com o leque, e uma citação como ela vira imagem.
    - **Carrossel das coleções populares:** rolagem horizontal nativa com snap, mais arrastar com o mouse (com um empurrão de mola ao soltar). Fica acessível pelo teclado e ganha `data-lenis-prevent`.
    - **Fim:** a chamada final ("Sua estante está esperando.") e o rodapé com links e o crédito da Open Library.
    - **Movimento reduzido:** as mesmas partes, sem o vínculo com a rolagem: capas paradas, a prateleira e o perfil já montados, entradas só com opacidade.
    - **LCP:** é o título, renderizado no servidor. As capas são pequenas e entram depois.
12. **Testes em espera** (pedido do usuário, 27/10). Cada task valida com typecheck, lint e uma sonda no dev (Playwright no scratchpad). A lista adiada vai para o CLAUDE.md.

## Fora desta fase

- O deploy na Vercel, o SMTP próprio e o cliente OAuth do Google ficam para a Fase 8, porque pedem as contas do usuário. Os testes E2E adiados também são da 8.
- Trocar o e-mail da conta: só com o SMTP próprio, na Fase 8.

## Review Focus

1. **CSV do Goodreads de verdade:** campos com vírgula, aspas e quebra de linha (as resenhas), ISBN no formato `="0451524934"`, nota 0, prateleiras próprias, arquivo vazio ou de outro app. Nada quebra, e cada linha ruim vira "não deu certo", sem parar o resto. Sonda da Task 2.
2. **Excluir conta:** só com o @ certo; depois, nada da pessoa sobra (perfil, estante, avatar), a sessão some, o livro que ela cadastrou continua no catálogo e quem a seguia não quebra. Sonda da Task 1, com uma conta de teste criada pelo admin.
3. **Câmera:** permissão negada, sem câmera, fechar a paleta com a câmera ligada (a luz da câmera tem de apagar), código que não é ISBN. Sonda da Task 3, com uma câmera falsa do Chromium.
4. **⌘K:** digitar rápido, acento ("sertao"), sem conta, sem resultado, a rede caindo. As setas e o Enter funcionam em todos os grupos. Sonda da Task 5.
5. **Landing em celular e com movimento reduzido:** nada sai da tela, nada vaza para os lados, a rolagem não engasga, e o LCP é o título. Sonda da Task 7, com o build de produção para o LCP.

## Mapa de arquivos

- **Configurações:** `app/(app)/configuracoes/page.tsx`, `features/profile/components/settings/*` e as actions `setPrivacy`, `changePassword` e `deleteAccount` (`features/profile/actions.ts`); `app/api/account/export/route.ts` e `features/profile/lib/export.ts` (monta o JSON e o CSV).
- **Goodreads:** `features/shelf/lib/csv.ts` (parser), `features/shelf/lib/goodreads.ts` (linhas para livros) e `features/shelf/components/goodreads-import.tsx`; `importGoodreadsBatch` em `features/shelf/actions.ts` e `features/books/lib/match.ts` (acha ou cria o livro, `server-only`).
- **Scanner:** `features/shelf/lib/isbn.ts`, `features/shelf/lib/barcode-reader.ts` e `features/shelf/components/add-book/scan-step.tsx`.
- **Sorteio:** `features/shelf/components/next-read/*`, `app/api/shelf/want/route.ts` e `startReading` (`features/shelf/actions.ts`).
- **⌘K:** `components/shell/command-palette.tsx`, `app/api/search/route.ts` e `lib/text-match.ts`.
- **OG, citação e sitemap:**
  - fontes e utilitários: `assets/fonts/*`, `lib/og/fonts.ts` e `lib/og/parts.tsx`;
  - imagens: `app/opengraph-image.tsx`, `app/(app)/livro/[id]/opengraph-image.tsx`, `app/(app)/u/[username]/opengraph-image.tsx`, `app/(app)/colecao/[id]/opengraph-image.tsx` e `app/api/quotes/[id]/image/route.tsx`;
  - compartilhar e indexar: `features/shelf/components/share-quote-button.tsx`, `app/sitemap.ts` e `app/robots.ts`.
- **Landing:** `features/landing/queries.ts`, `features/landing/components/*` e `app/(marketing)/page.tsx`.

---

### Task 1: Configurações

**Files:**

- Create: `app/(app)/configuracoes/page.tsx`, `features/profile/components/settings/settings-sections.tsx`, `features/profile/components/settings/password-form.tsx`, `features/profile/components/settings/privacy-setting.tsx`, `features/profile/components/settings/delete-account.tsx`, `features/profile/components/settings/export-data.tsx`, `features/profile/lib/export.ts`, `app/api/account/export/route.ts`
- Modify: `features/profile/actions.ts`, `features/profile/schemas.ts`, `lib/routes.ts` (sem o `as Route` de `configuracoes`), `app/(marketing)/page.tsx` (o toast da conta excluída)

**Interfaces:**

- Produces:
  - `setPrivacy(isPrivate: boolean): Promise<ActionResult>`;
  - `changePassword(input: { password: string; confirm: string }): Promise<ActionResult>`;
  - `deleteAccount(input: { confirm: string }): Promise<ActionResult>`, que só segue com o `@usuario` certo;
  - `buildExport(supabase, userId): Promise<AccountExport>` e `shelfToGoodreadsCsv(shelf): string`;
  - `GET /api/account/export?formato=json|csv`.

- [ ] **Step 1:** Implementar a página e as seções (cards de `rounded-card` com título em serif), as actions (zod → `requireViewer()` → escrita → `updateTag` → `ActionResult`) e a exportação.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev,** com uma conta de teste do admin:
  - a página abre logada, e sem conta vai para o Entrar;
  - a privacidade troca e persiste, e o tema troca;
  - a senha errada na confirmação dá erro gentil, e a certa troca;
  - o JSON e o CSV baixam com os livros;
  - excluir sem o @ certo não deixa;
  - com o @ certo, a conta some (o admin não acha o usuário), a landing mostra o toast, e o livro manual dela continua no catálogo.
- [ ] **Step 4:** Commit `feat(configuracoes): conta, privacidade, tema, exportar e excluir`.

### Task 2: Importar do Goodreads

**Files:**

- Create: `features/shelf/lib/csv.ts`, `features/shelf/lib/goodreads.ts`, `features/books/lib/match.ts`, `features/shelf/components/goodreads-import.tsx`
- Modify: `features/shelf/actions.ts`, `features/shelf/schemas.ts`, `features/profile/components/settings/settings-sections.tsx`

**Interfaces:**

- Consumes: Task 1.
- Produces:
  - `parseCsv(text: string): string[][]`;
  - `readGoodreadsExport(text: string): { books: GoodreadsBook[]; skipped: number } | { error: string }`, com `GoodreadsBook = { title; authors: string[]; isbn13: string | null; pageCount; publishedYear; status: ShelfStatus; rating: number | null; finishedAt: string | null; review: string | null }`;
  - `findOrCreateBook(book: GoodreadsBook, viewerId: string): Promise<string | null>`;
  - `importGoodreadsBatch(books: GoodreadsBook[]): Promise<ActionResult<{ results: ("added" | "kept" | "failed")[] }>>`, com no máximo 5 livros por lote.

- [ ] **Step 1:** Implementar o parser, o mapeamento, a busca do livro e a importação com progresso e resumo.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev,** com um CSV de exemplo no formato do Goodreads (livros reais, resenha com vírgula, aspas e quebra de linha, ISBN `="…"`, nota 0, prateleira `to-read` e uma linha quebrada):
  - a prévia conta certo;
  - a importação põe os livros na estante com os status;
  - importar de novo dá "já estava";
  - um arquivo que não é do Goodreads dá erro gentil.
- [ ] **Step 4:** Commit `feat(configuracoes): importar a biblioteca do Goodreads`.

### Task 3: Scanner de ISBN

**Files:**

- Create: `features/shelf/lib/isbn.ts`, `features/shelf/lib/barcode-reader.ts`, `features/shelf/components/add-book/scan-step.tsx`
- Modify: `features/shelf/components/add-book/add-book-flow.tsx`, `features/shelf/components/add-book/search-step.tsx`, `features/books/queries.ts` (o catálogo acha por ISBN), `package.json`

**Interfaces:**

- Produces:
  - `isbn13From(code: string): string | null` (ISBN-13 válido, ou o 10 convertido) e `isIsbnQuery(query: string): boolean`;
  - `startBarcodeReader(video: HTMLVideoElement, onIsbn: (isbn: string) => void): Promise<() => void>`, que usa o `BarcodeDetector` ou o `@zxing/browser`;
  - `<ScanStep onIsbn onCancel />`.

- [ ] **Step 1:** `npm install --save-exact @zxing/browser@0.2.1 @zxing/library@0.23.0`. Implementar o passo da câmera, o leitor e a busca do catálogo por ISBN.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev,** com celular emulado e a câmera falsa do Chromium (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`, `--use-file-for-fake-video-capture` com o código de barras de um ISBN real):
  - o botão aparece no toque e some no desktop;
  - a câmera abre, o ISBN cai na busca, e o livro aparece;
  - fechar a paleta desliga a câmera (nenhuma faixa de vídeo ativa);
  - sem permissão, a mensagem gentil aparece;
  - um ISBN digitado acha o livro do catálogo.
- [ ] **Step 4:** Commit `feat(estante): escanear o código de barras do livro`.

### Task 4: Sortear a próxima leitura

**Files:**

- Create: `features/shelf/components/next-read/next-read-provider.tsx`, `features/shelf/components/next-read/next-read-dialog.tsx`, `features/shelf/components/next-read/card-deck.tsx`, `app/api/shelf/want/route.ts`
- Modify: `features/shelf/actions.ts` (`startReading`), `features/shelf/components/profile-shelf.tsx`, `components/shell/providers.tsx`

**Interfaces:**

- Produces:
  - `useNextRead(): { open: (books?: BookVisual[]) => void; enabled: boolean }`;
  - `GET /api/shelf/want` → `{ books: BookVisual[] }` (401 sem conta);
  - `startReading(bookId: string): Promise<ActionResult>`;
  - `pickRandom<T>(items: T[], avoid?: T): T`.

- [ ] **Step 1:** Implementar o provider, o baralho (o embaralhar e a carta que vira), as ações e o botão na aba Estante.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev,** com uma conta de teste e 5 livros em Quero ler:
  - o botão aparece no filtro Quero ler do próprio perfil;
  - o baralho embaralha e uma carta vira, com título e autor;
  - "Sortear de novo" troca o livro;
  - "Começar a ler" muda para Lendo, e o livro aparece no "Lendo agora";
  - com movimento reduzido, só opacidade;
  - com a fila vazia, o estado vazio.
- [ ] **Step 4:** Commit `feat(estante): sortear a próxima leitura`.

### Task 5: ⌘K completo

**Files:**

- Create: `app/api/search/route.ts`, `lib/text-match.ts`
- Modify: `components/shell/command-palette.tsx`

**Interfaces:**

- Consumes: Tasks 3 e 4 (`useAddBook().openScanner()` e `useNextRead()`).
- Produces:
  - `GET /api/search?q=` → `{ shelf: BookVisual[]; books: BookVisual[]; readers: SuggestedReader[]; collections: CollectionVisual[] }`;
  - `matchesText(haystack: string, query: string): boolean`, sem acento e sem caixa;
  - `useAddBook()` ganha `openScanner()`.

- [ ] **Step 1:** Reescrever a paleta com a busca, os grupos, as ações, o "Ir para" e os estados.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:**
  - "sertao" acha Grande Sertão em Livros;
  - "ana" acha a leitora;
  - uma palavra de coleção acha a coleção;
  - um livro da própria estante aparece em "Na sua estante";
  - as setas e o Enter abrem o resultado;
  - sem conta, aparecem só as ações públicas;
  - "Sortear próxima leitura" abre o sorteio;
  - "Alternar tema" troca;
  - sem resultado, o vazio aparece.
- [ ] **Step 4:** Commit `feat(paleta): busca global e todas as ações no ⌘K`.

### Task 6: Imagens OG, citação como imagem, sitemap e robots

**Files:**

- Create: `assets/fonts/` (5 TTF + `OFL.txt`), `lib/og/fonts.ts`, `lib/og/parts.tsx`, `app/opengraph-image.tsx`, `app/(app)/livro/[id]/opengraph-image.tsx`, `app/(app)/u/[username]/opengraph-image.tsx`, `app/(app)/colecao/[id]/opengraph-image.tsx`, `app/api/quotes/[id]/image/route.tsx`, `features/shelf/components/share-quote-button.tsx`, `app/sitemap.ts`, `app/robots.ts`
- Modify: `features/shelf/components/quotes-block.tsx`, `features/shelf/components/quotes-list.tsx`, `features/profile/queries.ts` e `features/collections/queries.ts` (leituras públicas para o OG), `features/books/lib/color.ts` (`mixRgb`)

**Interfaces:**

- Produces:
  - `ogFonts(): Promise<ImageResponseOptions["fonts"]>`;
  - `<OgCover book width />` e `<OgWordmark />`;
  - `getProfileCard(username)` e `getCollectionCard(id)` (`'use cache'`, cliente sem sessão);
  - `GET /api/quotes/[id]/image` (PNG);
  - `<ShareQuoteButton quoteId bookTitle />`.

- [ ] **Step 1:** Baixar as fontes e implementar as imagens, o botão, o sitemap e o robots.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:**
  - cada `opengraph-image` responde PNG 1200×630, conferido nas capturas: livro com capa real, livro sem capa, perfil público, perfil privado, coleção e raiz;
  - as páginas trazem `og:image`;
  - a imagem da citação sai em 1080×1350 com a cor da capa;
  - uma citação de perfil privado dá 404 para visitante;
  - o botão baixa ou compartilha;
  - `/sitemap.xml` e `/robots.txt` respondem certo.
- [ ] **Step 4:** Commit `feat(compartilhar): imagens OG, citação como imagem e sitemap`.

### Task 7: Landing com narrativa de rolagem

**Files:**

- Create: `features/landing/queries.ts`, `features/landing/components/hero-stage.tsx`, `features/landing/components/book-box.tsx`, `features/landing/components/feature-demos.tsx`, `features/landing/components/collections-carousel.tsx`, `features/landing/components/landing-footer.tsx`
- Modify: `app/(marketing)/page.tsx`

**Interfaces:**

- Produces: `getLandingData(): Promise<{ showcase: { profile: ProfileSummary; counts: ProfileCounts; books: BookVisual[] }; collections: CollectionVisual[] }>`, em `'use cache'` com `cacheLife("hours")` e a tag `explore`. Também `<HeroStage showcase />`, `<BookBox book spineWidth />` (a caixa 3D com a capa e a lombada) e `<CollectionsCarousel collections />`.

- [ ] **Step 1:** Implementar as seções, com o palco fixo e as transformações ligadas à rolagem.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev,** com capturas a 360 e a 1440px:
  - o topo traz o título palavra por palavra;
  - as capas reagem ao mouse;
  - rolando, as capas viram lombadas na prateleira e o perfil entra;
  - as três demonstrações se mexem;
  - o carrossel arrasta;
  - com movimento reduzido, tudo aparece montado, sem vínculo com a rolagem;
  - nada vaza para os lados;
  - com conta, `/` vai para `/inicio`.
- [ ] **Step 4:** Commit `feat(landing): narrativa de rolagem da capa ao perfil`.

### Task 8: Fechamento da fase

- [ ] **Step 1: Sonda final:**
  - LCP da landing no build de produção (`next start` na 3100, com o PerformanceObserver), abaixo de 2,5s;
  - capturas de 360 a 1920px nos temas claro e escuro;
  - sem erros de console nas páginas novas.
- [ ] **Step 2:** `npm run typecheck && npm run lint && npm test && npm run build`. Expected: exit 0.
- [ ] **Step 3:** Atualizar o CLAUDE.md: o Estado da Fase 7, as convenções novas (OG, ⌘K, sorteio, scanner, importação) e os testes adiados. Commit `docs: estado da fase 7`.
