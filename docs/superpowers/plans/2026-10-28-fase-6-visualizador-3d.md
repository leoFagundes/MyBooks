# Fase 6 · Visualizador 3D: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ver qualquer livro em 3D. Da página do livro, a capa voa até o centro da tela e vira um livro de verdade, que gira, aproxima, inclina com o celular e abre na folha de rosto.

**Architecture:** O visualizador é um diálogo em tela cheia por cima da página do livro, sem rota própria. A parte de DOM fica no bundle da página e é leve: o botão, o voo do clone 2D, a pílula, os gestos e o teclado. Tudo o que importa three, R3F e drei mora em `features/viewer-3d/scene/` e chega por `next/dynamic` (sem SSR) só quando o visualizador abre, com pré-carga na intenção. Os dois lados conversam por motion values do Motion: o DOM anima os valores com as molas de `lib/motion.ts`, e a cena (frameloop `demand`) os lê a cada quadro e só desenha quando eles mudam. Um módulo de enquadramento sem three calcula onde a capa 3D aparece de frente. O clone voa exatamente para esse retângulo, e por isso a troca do 2D para o 3D é um crossfade sem salto.

**Tech Stack:** Next 16.4.3, React 19.3.1, three 0.186.1, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, @types/three 0.186.0, Motion 14.6.0, radix-ui 1.8.1 (Dialog), @tanstack/react-query 5.105.0, sonner 2.0.8.

**Spec:** [SPEC.md](../../../SPEC.md) (§5.7; §5.6, ação "Ver em 3D"; §3, regras e momentos 7 e 10; §8) · Arquitetura e versões: [Fase 0](2026-10-24-fase-0-arquitetura.md) · Página do livro e viagem da capa: [Fase 3](2026-10-24-fase-3-estante.md)

**Pré-requisito:** Fases 2 a 5 integradas à `master` (28/10/2026).

## Global Constraints

- §5.7: "Abre em tela cheia, com a capa viajando até a posição do livro 3D. Usa React Three Fiber + drei, importados com next/dynamic (sem SSR) e carregados só quando o visualizador abre."
- Modelo: "miolo de páginas com textura de borda de papel, capa e contracapa com a imagem real (ou a capa gerada) e lombada com o título. Espessura definida pelo número de páginas."
- Luz: "Iluminação de estúdio suave (Environment/Lightformers), ContactShadows no chão e leve brilho na capa."
- Controles: "arrastar para girar, com mola e retorno suave (PresentationControls); zoom pelo scroll ou pinça; duplo clique para voltar à posição inicial; setas do teclado também giram."
- "Abrir": "a capa gira pela dobra com mola e revela a folha de rosto, com título, autor, sinopse e uma citação da comunidade. Se der tempo, permita folhear algumas páginas com curvatura (bones/skinning)."
- Celular: "inclinar o aparelho gira levemente o livro (DeviceOrientation, pedindo permissão)."
- Interface: "pílula flutuante com Girar · Abrir · Resetar · Fechar (Esc)."
- §8: "three.js fora do bundle inicial"; Lighthouse ≥ 90 no celular; 60fps num celular intermediário.
- Movimento: só os presets de `lib/motion.ts`; no DOM, anima só `transform` e `opacity`; toda saída é mais rápida que a entrada; com movimento reduzido, só opacidade.
- Cores: nenhum hex nem função de cor em `.ts`/`.tsx` (`tests/design-rules.test.ts`). A cor do livro vem de `bookColor`/`coverInk`, e as tintas de `INK_RGB`/`PAPER_RGB` (`features/books/lib/color.ts`).
- Interface 100% pt-BR, foco visível, `aria-label` nos botões de ícone, contraste AA, de 360 a 1920px; estados de carregando, vazio, erro e sucesso.

## Decisões

1. **Por cima da página, sem rota.** O visualizador é um `Dialog` do Radix (foco preso, Esc, `aria-modal`, rolagem travada) em tela cheia, no z-50 dos outros diálogos: o ⌘K, que não confere modal aberto, abre por cima. Abrir empilha uma entrada no histórico, na mesma URL e com a marca `mybooks:3d` no `history.state` (junto do estado interno do Next). Assim, o voltar do navegador (ou o gesto do Android) fecha o visualizador. Fechar pelo botão ou pelo Esc chama `history.back()` quando a marca está lá. Não há link direto para o 3D, porque o SPEC não pede.
2. **Onde abre.** O botão "Ver em 3D" (contorno, ícone `Rotate3d`, `aria-haspopup="dialog"`) fica sob a capa no topo da página do livro, dentro do `BookHero`. Assim ele vale também para o `/dev/livro/[slug]`. Clicar ou tocar na própria capa também abre (atalho de mouse e toque; o botão é o caminho acessível). No esqueleto, o botão aparece desabilitado e no mesmo lugar, para nada pular quando a página chega (CLS zero). Enquanto o visualizador está aberto, a capa da página fica com opacidade 0: quem está na tela é o clone.
3. **Carga sob demanda.** `features/viewer-3d/scene/book-scene.tsx` é o único ponto de entrada de three, R3F e drei, e chega por `next/dynamic(..., { ssr: false })`. Passar o mouse ou focar o botão (ou a capa) já dispara o `import()` do mesmo módulo. As versões são as do plano da Fase 0, que continuam as estáveis mais recentes (o R3F 9.8.2 aceita React `>=19 <19.4`).
4. **A viagem.** A ida tem quatro passos:
   1. O clone (`BookCover`) sai do retângulo da capa na página e voa até o retângulo onde a capa 3D aparece de frente: x, y e escala com `smooth`, fundo com `tweens.base`.
   2. Só depois do pouso a cena monta (a compilação dos shaders não trava o voo). Se ela demorar, aparece "Montando o livro…" depois de 400ms.
   3. Quando a cena desenha o primeiro quadro, vem o crossfade: canvas de 0 a 1 e clone de 1 a 0, com `tweens.base`.
   4. O livro gira para a pose de 3/4 (lombada à vista: yaw 0,5 rad, pitch 0,12 rad) com `gentle`.

   A volta: o livro volta de frente com `snappy`, há um crossfade de `tweens.fast`, e o clone volta à capa com `snappy` enquanto o fundo some com `tweens.fast`. Com movimento reduzido não há voo nem giro: o clone surge no lugar, e o canvas entra já em 3/4, só com opacidade.

5. **Enquadramento** (`framing.ts`, sem three). A câmera é perspectiva, com fov de 30°. O palco é a tela menos as margens: em cima 72px (o título) e embaixo 104px (a pílula); em telas com menos de 520px de altura, 12 e 76px. Dos lados, 24px. A altura da capa é `min(0,8 × altura do palco, 0,8 × largura do palco ÷ (2/3))`. A distância da câmera sai dessa altura. O centro do palco vira o centro da projeção com `camera.setViewOffset`, então a capa de frente continua um retângulo exato. Na volta, o retângulo é medido de novo.
6. **Modelo** (unidades do mundo). Altura 3 e largura 2 (os 2:3 da capa). O miolo tem `clamp(páginas × 0,00065, 0,06, 0,75)` de espessura, e sem número de páginas valem 280. A capa é dura: placas de 0,025, que sobram 0,04 além do miolo em cima, embaixo e na frente. A lombada é reta. Os materiais:
   - capa e contracapa: `MeshPhysicalMaterial` com clearcoat 0,35, o "leve brilho";
   - bordas das placas: a cor do livro;
   - miolo: textura de borda de papel nas três faces à mostra;
   - guardas: o papel tingido pela cor do livro (35%).

   As texturas:
   - **Capa:** a imagem real, recortada como o `object-cover` do 2D; sem ela, a capa tipográfica, com as regras do `GeneratedCover` (serif 13% da largura, mono 6,5%, margem 10%, `coverInk`).
   - **Contracapa:** a cor do livro (pelo `coverInk`), com a sinopse em Geist e o autor em mono. O catálogo não guarda a imagem da contracapa, e repetir a da frente pareceria erro; por isso ela é desenhada, como a capa tipográfica.
   - **Lombada:** o título descendo, em serif, e o autor em mono, como o `BookSpine`.

7. **Textura da capa direto da origem.** A URL vem do `imageLoader` no tamanho L, com `crossOrigin = "anonymous"`. Conferido em 28/10: a Open Library e o archive.org mandam `Access-Control-Allow-Origin` (o archive.org com `Vary: Origin`), e o bucket do Supabase manda `*`. Se a imagem falhar (404, CORS, rede), entra a capa tipográfica, nunca uma textura preta. O texto dos canvas usa as fontes do app, lidas das variáveis `--font-*` e esperadas com `document.fonts.load`.
8. **Estúdio.** `Environment` com `Lightformer` (sem HDR para baixar, renderizado uma vez), `ContactShadows` no chão e tone mapping `NeutralToneMapping`, para as cores da capa ficarem fiéis no crossfade. O resto: frameloop `demand`, `dpr` entre 1 e 2, canvas transparente sobre o fundo do app e o `AmbientGlow` da cor do livro no topo.
9. **Controles próprios, no lugar do `PresentationControls`.** O `PresentationControls` traz as molas do react-spring (fora dos presets) e não tem teclado, inclinação, pinça nem duplo clique. Por isso um hook só (`useBookPose`) guarda os motion values e anima com `snappy`, `smooth` e `gentle`.
   - **Arrastar:** 0,01 rad/px no yaw e 0,006 no pitch, e o livro segue com `snappy`. Ao soltar, o alvo anda velocidade × 0,12s e assenta com `smooth`. O pitch fica entre ±0,6 rad.
   - **Zoom:** roda ou pinça (fator `exp(−deltaY × 0,0015)`), entre 0,7 e 2,2, com `snappy`.
   - **Teclado:** setas dão 30° (←/→) e 15° (↑/↓) com `smooth`; + e − dão zoom × 1,25.
   - **Duplo clique ou toque:** volta à pose inicial com `gentle`, pelo caminho mais curto (sem desenrolar voltas).
   - **Girar:** liga um giro contínuo de 0,6 rad/s. A velocidade sobe e desce com `gentle`, então nada começa nem para de repente. Arrastar desliga.
   - **Resetar:** desliga o giro, fecha o livro e volta à pose inicial.
10. **Abrir.** A capa gira pela dobra até −170° com `gentle` (o bounce de 0,25 é a "mola"); fechar o livro usa `smooth`. Ao abrir, o livro fica de frente e o giro passa a ter limite (yaw ±0,6, pitch ±0,35).
    - **Tela larga** (palco com pelo menos 1,8 vez a largura da capa): o livro desliza meia capa para a direita e o zoom encaixa as duas páginas.
    - **Tela estreita:** a câmera fica na página da direita.

    A folha de rosto é um canvas de tinta sobre papel com o título, o autor, a sinopse (até 9 linhas) e uma citação da comunidade, com o @ e a página. O mesmo texto vai para o DOM, só para leitor de tela.

11. **Citações.** `GET /api/books/[id]/quotes` traz até 7, com a RLS da sessão (visitante vê as de perfis públicos). Vêm primeiro as de até 280 caracteres, das mais novas para as mais antigas. O cliente usa React Query ao abrir, e a folha se redesenha quando elas chegam. Id fora do formato (os livros do `/dev`) devolve uma lista vazia.
12. **Inclinar.** Aparece em aparelho de toque (`pointer: coarse`) com `DeviceOrientationEvent`, como um botão "Inclinar" na pílula (`aria-pressed`). Onde não há permissão a pedir (Android), começa ligado, a não ser com movimento reduzido. Onde há `requestPermission` (iOS), começa desligado e o toque pede a permissão; negada, um toast explica. O alcance é de até ±0,25 rad no yaw e ±0,17 no pitch, com `snappy`, e a linha de base se acomoda devagar (uns 3s) à nova postura.
13. **Pílula e teclado.** Girar (`aria-pressed`) · Abrir (`aria-pressed`) · Resetar · Fechar, com `Esc` em `Kbd` no desktop; Inclinar no toque. Do `sm:` para cima, ícone com rótulo; abaixo, só o ícone (44px, com `aria-label`). O estilo é o da pílula da barra inferior. No topo, discretos, o título (`DialogTitle`, em serif) e o autor. Ao abrir, o foco vai para o palco (`role="application"`, com as instruções em `aria-describedby`). Ao fechar, volta ao "Ver em 3D". As setas, o + e o − funcionam em qualquer ponto do diálogo.
14. **Estados.**
    - Carregando: o clone parado no lugar e "Montando o livro…" (`aria-live`).
    - Erro (sem WebGL, chunk que falhou ou contexto perdido): "Não deu para abrir o livro em 3D neste aparelho." com "Tentar de novo", que remonta a cena. O clone 2D continua, e só o Fechar segue ativo.
    - Vazio: sem sinopse ou sem citação, a folha de rosto se reorganiza e não mostra buraco.
15. **Folhear, se der tempo** (Task 5). Até três folhas finas sobre o miolo, cada uma uma `SkinnedMesh` com ossos ao longo da largura. Tocar na metade direita vira a folha, com curvatura (os ossos dobram mais no meio do giro, com `smooth`); a esquerda desvira. As folhas trazem as outras citações, uma por página. Sem citações extras, não há folha para virar.
16. **Testes em espera** (pedido do usuário, 27/10). Cada task valida com typecheck, lint e uma sonda no dev (Playwright no scratchpad, com WebGL por SwiftShader). A lista adiada vai para o CLAUDE.md.

## Fora desta fase

- "Ver em 3D" na estante, na grade e no ⌘K: a paleta completa é da Fase 7.
- Link direto para o visualizador (`?ver=3d`) e imagem de compartilhamento do livro em 3D: fora do SPEC.

## Review Focus

1. **Capa que não carrega:** sem `cover_url`, com imagem quebrada (404) ou com CORS falho, o 3D mostra a capa tipográfica, nunca preto nem branco. Sonda da Task 2 (`a-paixao-segundo-gh` sem capa e `quarto-de-despejo` com 404, no `/dev`).
2. **Fechar no meio do caminho:** Esc durante o voo, dois cliques no "Ver em 3D", voltar do navegador antes da cena ficar pronta, ⌘K e "Ir para…" com o visualizador aberto. Nada de clone preso, de capa sumida na página, de foco perdido ou de entrada extra no histórico. Sonda da Task 1.
3. **Sem 3D no aparelho:** WebGL desligado, chunk que não baixa (offline) ou contexto perdido levam ao estado de erro com "Tentar de novo", e o Fechar sempre funciona. Sonda da Task 1 (`--disable-3d-apis` e a rota do chunk abortada).
4. **Livros extremos:** 96 e 608 páginas, sem número de páginas, título enorme, autor vazio, sem sinopse e sem citação. Espessura, lombada e folha de rosto continuam legíveis e sem texto vazando. Sondas das Tasks 2 e 4.
5. **Toque, teclado e tela pequena:** pinça e arrasto sem mexer na página por trás, Esc fecha, as setas giram, o foco volta ao botão, e tudo cabe de 360px a 1920px e no celular deitado. Sonda da Task 3.

## Mapa de arquivos

- `features/viewer-3d/lib/` (sem three): `dimensions.ts`, `framing.ts`, `types.ts` (props da cena e motion values), `use-book-pose.ts`, `device-tilt.ts`, `canvas-text.ts` e `book-art.ts` (desenha a capa tipográfica, a contracapa, a lombada, as bordas e a folha de rosto em canvas).
- `features/viewer-3d/components/` (DOM): `view-in-3d.tsx` (botão, capa clicável e histórico), `book-viewer.tsx` (diálogo, voo, palco, gestos e estados) e `viewer-pill.tsx`.
- `features/viewer-3d/scene/` (three, carregado sob demanda): `book-scene.tsx` (o `Canvas` e o sinal de pronto), `book-model.tsx`, `book-textures.ts`, `studio.tsx` e, na Task 5, `page-leaf.tsx`.
- `app/api/books/[id]/quotes/route.ts`; `features/books/queries.ts` ganha `readBookQuotes`.

---

### Task 1: Abrir e fechar, com a capa voando

**Files:**

- Modify: `package.json`, `package-lock.json`, `features/books/components/book-hero.tsx`, `features/books/components/book-page-skeleton.tsx`
- Create: `features/viewer-3d/lib/dimensions.ts`, `features/viewer-3d/lib/framing.ts`, `features/viewer-3d/lib/types.ts`, `features/viewer-3d/components/view-in-3d.tsx`, `features/viewer-3d/components/book-viewer.tsx`, `features/viewer-3d/components/viewer-pill.tsx`, `features/viewer-3d/scene/book-scene.tsx`

**Interfaces:**

- Produces: `bookDimensions(pageCount: number | null): BookDimensions`, com `BookDimensions = { width: 2; height: 3; pagesDepth: number; board: number; overhang: number; depth: number }`. Também `frameBook(viewport: Size, dims: BookDimensions): Framing`, com `Size = { width: number; height: number }`, `Rect = { left; top; width; height }` e `Framing = { cover: Rect; distance: number; viewOffsetY: number; stage: Rect }`, onde `distance` vai da câmera à face da capa no zoom 1.
- `PoseValues = { yaw; pitch; zoom; open; tiltYaw; tiltPitch: MotionValue<number> }` e `SceneProps = { book: BookVisual; description: string | null; dims: BookDimensions; framing: Framing; pose: PoseValues; onReady: () => void }` (`types.ts`, só tipos).
- `<ViewIn3D book={BookVisual} description={string | null} pending?: boolean>{capa}</ViewIn3D>`; `preloadBookScene(): void`. Também `<BookViewer book description source={HTMLElement} closing={boolean} onRequestClose={() => void} onClosed={() => void} />` e `<ViewerPill onClose ... />` (nesta task, só com Fechar).

- [ ] **Step 1:** `npm install three@0.186.1 @react-three/fiber@9.8.2 @react-three/drei@10.7.9` e `npm install -D @types/three@0.186.0`, com versões exatas, como o resto do `package.json`.
- [ ] **Step 2:** Implementar `dimensions.ts` e `framing.ts` com os números das decisões 5 e 6.
- [ ] **Step 3:** Implementar o lançador, o diálogo e a cena provisória: uma caixa na cor do livro, nas medidas do modelo, para provar o enquadramento. O roteiro de fases é entrando → aberto → saindo. Um `history.pushState` com a marca no clique; o `popstate` sem a marca fecha. O cleanup de `useLayoutEffect` fecha sem animar quando a rota fica escondida. O erro de carga ou de WebGL vai para um error boundary, com "Tentar de novo".
- [ ] **Step 4:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 5: Sonda no dev** (1440×900 e 360×740):
  - o chunk do three não baixa antes da intenção;
  - o clone sai da capa e pousa no retângulo do `frameBook`, e a capa da página some;
  - a caixa aparece com o crossfade, alinhada ao clone (captura antes e depois);
  - Esc, Fechar e o voltar do navegador fecham com o voo de volta, e o foco volta ao botão;
  - Esc durante o voo e dois cliques seguidos não deixam clone preso;
  - `--disable-3d-apis` mostra o erro, e o Fechar funciona;
  - sem erros no console.
- [ ] **Step 6:** Commit `feat(3d): o visualizador abre com a capa voando`.

### Task 2: O livro em 3D

**Files:**

- Create: `features/viewer-3d/lib/canvas-text.ts`, `features/viewer-3d/lib/book-art.ts`, `features/viewer-3d/scene/book-textures.ts`, `features/viewer-3d/scene/book-model.tsx`, `features/viewer-3d/scene/studio.tsx`
- Modify: `features/viewer-3d/scene/book-scene.tsx`, `features/viewer-3d/components/book-viewer.tsx` (a pose de 3/4 depois do crossfade)

**Interfaces:**

- Consumes: Task 1.
- Produces:
  - `fontStack(variable: "--font-instrument-serif" | "--font-geist-sans" | "--font-geist-mono"): string`;
  - `wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number, options?: { balance?: boolean }): string[]` (a última linha leva "…" quando corta);
  - em `book-art.ts`, `drawGeneratedCover(book): HTMLCanvasElement`, `drawBackCover(book, description): HTMLCanvasElement`, `drawSpine(book, dims): HTMLCanvasElement` e `drawPageEdges(seed: string): HTMLCanvasElement`;
  - `loadBookTextures(book, description, dims, renderer): Promise<BookTextures>`, guardado por livro para o `use()` do React suspender uma vez só, com `BookTextures = { cover; back; spine; edges: Texture; coverColor: Color; endpaper: Color }`;
  - `SETTLE_POSE = { yaw: 0.5, pitch: 0.12 }` (`types.ts`).

- [ ] **Step 1:** Implementar os desenhos dos canvas, as texturas (imagem L com recorte de `object-cover` e reserva tipográfica no erro; `SRGBColorSpace`; anisotropia até 8), o modelo (placas, lombada, miolo e a dobra da capa já como um grupo com pivô na lombada, para a Task 4) e o estúdio. O dispose das texturas fica no unmount.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev**, com capturas:
  - Dom Casmurro (capa real), A paixão segundo G.H. (sem capa) e Quarto de despejo (404), no `/dev/livro/…`: capa certa nos três, sem preto;
  - A hora da estrela (96 páginas) é fino, e Duna (608) é grosso;
  - na pose de 3/4 se veem a lombada com o título e a borda das páginas;
  - no fim do crossfade, a diferença entre o clone e o 3D é pequena (mesma posição e brilho parecido);
  - contracapa com a sinopse.
- [ ] **Step 4:** Commit `feat(3d): o livro em 3D`.

### Task 3: Girar, aproximar e inclinar

**Files:**

- Create: `features/viewer-3d/lib/use-book-pose.ts`, `features/viewer-3d/lib/device-tilt.ts`
- Modify: `features/viewer-3d/components/book-viewer.tsx` (gestos e teclado no palco), `features/viewer-3d/components/viewer-pill.tsx` (Girar, Resetar e Inclinar)

**Interfaces:**

- Consumes: Tasks 1 e 2.
- Produces:
  - `useBookPose(reduced: boolean): BookPose`, com `BookPose = { values: PoseValues; spinning: boolean; drag(dx: number, dy: number): void; release(vx: number, vy: number): void; step(direction: "left" | "right" | "up" | "down"): void; zoomBy(factor: number): void; reset(): void; settle(): void; toFront(): Promise<void>; setSpinning(on: boolean): void; setTilt(yaw: number, pitch: number): void }`. `drag` recebe px e `release` recebe px/s. Com `reduced`, as molas viram salto, como faz o `MotionConfig`.
  - `orientationSupport(): "none" | "granted" | "prompt"`, `requestOrientation(): Promise<boolean>` e `useDeviceTilt(enabled: boolean, onTilt: (yaw: number, pitch: number) => void): void`.

- [ ] **Step 1:** Implementar o hook, os gestos do palco e a pílula completa, menos o Abrir:
  - gestos: Pointer Events com `touch-action: none` e captura do ponteiro; pinça com dois ponteiros; `wheel` com `passive: false`; toque duplo detectado à mão (300ms, 10px);
  - teclado: setas, + e − no conteúdo do diálogo;
  - giro contínuo pelo `frame` do Motion.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:**
  - arrastar gira e o livro assenta com mola;
  - a roda aproxima, mas não rola a página por trás;
  - o duplo clique volta à pose de 3/4;
  - as setas giram, e + e − aproximam;
  - Girar liga e desliga (`aria-pressed`) e Resetar para tudo;
  - com o celular emulado (360×740, toque), a pinça por CDP aproxima e o Inclinar aparece;
  - com movimento reduzido, não há voo nem giro de entrada;
  - o foco fica preso no diálogo e volta ao botão.
- [ ] **Step 4:** Commit `feat(3d): girar, aproximar e inclinar`.

### Task 4: Abrir o livro na folha de rosto

**Files:**

- Create: `app/api/books/[id]/quotes/route.ts`
- Modify: `features/books/queries.ts`, `features/viewer-3d/lib/framing.ts`, `features/viewer-3d/lib/book-art.ts`, `features/viewer-3d/lib/types.ts`, `features/viewer-3d/lib/use-book-pose.ts`, `features/viewer-3d/scene/book-model.tsx`, `features/viewer-3d/scene/book-textures.ts`, `features/viewer-3d/components/book-viewer.tsx`, `features/viewer-3d/components/viewer-pill.tsx`

**Interfaces:**

- Consumes: Tasks 1 a 3.
- Produces:
  - `CommunityQuote = { text: string; page: number | null; reader: CommunityReader }` e `readBookQuotes(supabase, bookId: string, limit = 7): Promise<CommunityQuote[]>`;
  - `GET /api/books/[id]/quotes` → `{ quotes: CommunityQuote[] }` (400 com id inválido, 502 com erro, `Cache-Control: private, no-store`);
  - `openFraming(viewport: Size, dims: BookDimensions, framing: Framing): { zoom: number; shiftX: number }`;
  - `drawTitlePage(book, description, quote: CommunityQuote | null): HTMLCanvasElement`;
  - `SceneProps` ganha `quotes: CommunityQuote[]`, e `BookPose` ganha `opened: boolean` e `setOpen(open: boolean, frame: { zoom: number; shiftX: number }): void`.

- [ ] **Step 1:** Implementar a leitura, o Route Handler, a dobra da capa (−170° no pivô da lombada, `open` animado), o deslize e o zoom da tela larga, a folha de rosto e o texto para leitor de tela. Abrir com o livro girado traz o livro de frente antes. Arrastar com o livro aberto respeita os limites da decisão 10.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:**
  - Abrir num livro do seed com citação (Dom Casmurro): a capa gira com um leve passo além, e a folha mostra título, autor, sinopse e a citação com @ e página;
  - num livro sem citação nem sinopse, a folha fica equilibrada;
  - a 1440px aparecem as duas páginas, e a 360px a página da direita;
  - Abrir de novo fecha (`aria-pressed`), e Resetar fecha e volta à pose inicial;
  - `/api/books/<id>/quotes` sem sessão traz só citações de perfis públicos.
- [ ] **Step 4:** Commit `feat(3d): abrir o livro na folha de rosto`.

### Task 5: Folhear (se der tempo)

**Files:**

- Create: `features/viewer-3d/scene/page-leaf.tsx`
- Modify: `features/viewer-3d/scene/book-model.tsx`, `features/viewer-3d/lib/book-art.ts`, `features/viewer-3d/lib/use-book-pose.ts`, `features/viewer-3d/components/book-viewer.tsx`

**Interfaces:**

- Consumes: Task 4.
- Produces: `<PageLeaf front={Texture} back={Texture} turned={MotionValue<number>} index={number} dims />`: uma `SkinnedMesh` de 0,004 de espessura com 24 segmentos e um osso por segmento. Com o giro `t` de 0 a 1, a raiz gira `t·π` e cada osso dobra `sin(t·π)·0,22/24`. `BookPose` ganha `turnPage(direction: 1 | -1): void`.

- [ ] **Step 1:** Implementar as folhas sobre o miolo. A folha de rosto passa a ser a frente da primeira, e as outras citações viram as páginas seguintes. Tocar na metade direita vira, e na esquerda desvira; as setas ← e → também viram quando o livro está aberto.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:** num livro com 3 ou mais citações, a folha vira com curvatura e assenta; sem citações extras, não há folha para virar; Resetar fecha tudo.
- [ ] **Step 4:** Commit `feat(3d): folhear as páginas`.

### Task 6: Fechamento da fase

**Files:**

- Modify: `CLAUDE.md` (Estado, convenções do 3D e testes adiados)

- [ ] **Step 1: Sonda final**, de 360 a 1920px e nos temas claro e escuro:
  - o JS inicial de `/livro/[id]` não traz three (lista de chunks do build e rede antes do clique);
  - parado, a cena não desenha quadro nenhum (frameloop `demand`);
  - a viagem completa, ida e volta, com captura de cada fase.
- [ ] **Step 2:** `npm run typecheck && npm run lint && npm test && npm run build`. Expected: exit 0, e "Bundle do navegador sem chaves secretas.".
- [ ] **Step 3:** Atualizar o CLAUDE.md: Estado da Fase 6, convenções do 3D (three só em `features/viewer-3d/scene`; cores pelas tintas e por `bookColor`; fontes do canvas pelas variáveis CSS; nada de PresentationControls) e a lista de testes adiados (unitários de `framing`, `dimensions` e `wrapLines`; E2E "abrir o visualizador 3D" do SPEC §9).
- [ ] **Step 4:** Commit `docs: estado da fase 6`.
