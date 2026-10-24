# MyBooks: especificação do projeto

Você vai construir comigo o **MyBooks**, uma rede social de leitura minimalista. Cada pessoa cria uma conta, monta sua estante (livros lidos, lendo, quero ler e abandonados), organiza coleções, visita perfis de outros leitores, copia livros e coleções para a própria estante e vê qualquer livro em 3D.

Princípio do produto: **a interface fica quieta para os livros falarem.** A UI é neutra e silenciosa, e a cor vem das capas. O que torna o produto memorável é o movimento: animações fluidas, com física e com intenção.

Fora do escopo (não crie): conquistas ou badges, página de estatísticas, gráficos, metas de leitura, streaks, retrospectiva ou qualquer gamificação.

## Como trabalhar

- Trabalhe em fases (seção 11). Antes da Fase 1, apresente um plano curto (estrutura de pastas, bibliotecas com versões, decisões de arquitetura) e espere minha aprovação.
- Use as versões estáveis mais recentes. Consulte a documentação atual antes de usar APIs que mudam com frequência: proxy/middleware do Next, @supabase/ssr, View Transitions, Tailwind v4 e Motion.
- Ao fim de cada fase: rode typecheck, lint e build, corrija os erros, me diga o que testar manualmente e faça um commit com mensagem clara.
- Crie um CLAUDE.md com as convenções do projeto e mantenha-o atualizado.
- Interface 100% em português do Brasil, com textos curtos e calorosos. Nada de lorem ipsum.
- Se algo nesta especificação estiver ambíguo, ou se houver uma solução claramente melhor, proponha antes de implementar.

## 1. Stack e bibliotecas

Base obrigatória: Next.js (App Router, Server Components, Server Actions) · TypeScript estrito · Tailwind CSS v4 · Motion (motion/react) · Supabase (Auth, Postgres, Storage, Realtime) · Vercel.

Bibliotecas recomendadas (justifique se quiser trocar alguma):

| Necessidade                               | Biblioteca                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Componentes acessíveis                    | shadcn/ui (Radix), restilizados para o visual minimalista                              |
| Integração Supabase + Next                | @supabase/ssr e @supabase/supabase-js                                                  |
| Rolagem suave                             | Lenis (lenis/react), sincronizado com o loop de frames do Motion                       |
| Livro 3D                                  | three + @react-three/fiber + @react-three/drei, carregados sob demanda                 |
| Arrastar e reordenar                      | @dnd-kit/core + @dnd-kit/sortable (Reorder do Motion em listas simples)                |
| Paleta de comandos                        | cmdk                                                                                   |
| Toasts                                    | sonner                                                                                 |
| Drawers e bottom sheets                   | vaul                                                                                   |
| Números animados                          | @number-flow/react                                                                     |
| Formulários e validação                   | react-hook-form + zod (o zod também valida toda Server Action)                         |
| Cache e atualizações otimistas no cliente | @tanstack/react-query para busca instantânea e scroll infinito; useOptimistic no resto |
| Tema claro/escuro                         | next-themes                                                                            |
| Ícones                                    | lucide-react (traço 1.5)                                                               |
| Cor dominante das capas                   | node-vibrant (servidor) ou fast-average-color (cliente)                                |
| Leitura de código de barras (ISBN)        | BarcodeDetector nativo, com @zxing/browser como alternativa                            |
| Imagens de compartilhamento               | next/og                                                                                |
| Testes                                    | Vitest (utilitários) + Playwright (fluxos principais)                                  |
| Métricas                                  | @vercel/analytics + @vercel/speed-insights                                             |

Dados de livros: Open Library (Search API e Covers API, sem chave) como fonte principal e Google Books como alternativa. Faça a busca por uma Route Handler ou Server Action com cache, normalize os dados e salve o livro no catálogo na primeira vez que alguém o adicionar.

## 2. Design minimalista

- Neutro e editorial: muito espaço em branco, bordas de 1px, quase nenhuma sombra e nenhum gradiente decorativo. A única cor forte da tela deve vir das capas.
- Cores definidas como tokens no @theme do Tailwind v4 (nenhuma cor solta no código):
  - Claro: fundo #FAFAF8 · superfície #FFFFFF · borda #EAEAE6 · texto #111110 · secundário #6E6E69 · acento #D9541E (só em foco, curtidas e seleção).
  - Escuro: fundo #0B0B0A · superfície #141413 · borda #22221F · texto #EDEDEA · secundário #8B8B86 · acento #F07040.
  - Botão primário: cores invertidas (preto no tema claro, branco no escuro).
- Tipografia (next/font): Instrument Serif nos títulos de páginas e de livros, Geist Sans na interface e Geist Mono nos metadados pequenos (páginas, ano, ISBN, contadores).
- Forma: raio de 10px em controles, 14px em cards e 3px nas capas, como num livro de verdade. Grade de 4/8px. Ícones discretos.
- Navegação: barra superior fina e translúcida, com o logo à esquerda; Início, Explorar e Minha estante no centro; ⌘K, botão +, notificações e avatar à direita. No celular, uma barra inferior em forma de pílula flutuante.
- O tema escuro recebe o mesmo cuidado do claro, com troca suave entre os dois.

## 3. Movimento (prioridade do projeto)

Crie `lib/motion.ts` com os presets abaixo e use só eles:

- Molas: `snappy` (bounce 0, visualDuration 0.2), `smooth` (bounce 0.15, visualDuration 0.4) e `gentle` (bounce 0.25, visualDuration 0.6).
- Transições sem mola: curva `[0.22, 1, 0.36, 1]` e durações de 150, 250 e 400ms.
- `<MotionConfig reducedMotion="user">` na raiz, com versões reduzidas (só opacidade) de todas as animações.

Regras:

- Anime só transform, opacity e, com moderação, filter. Não anime width, height, top ou left: para isso, use `layout`. Meta de 60fps num celular intermediário.
- Elementos interativos usam mola. Nada de animação linear.
- Toda mudança de estado tem continuidade: nada aparece ou some de repente.

Momentos obrigatórios:

1. **Transição compartilhada entre rotas** com View Transitions (componente `<ViewTransition>` do React ou flag do Next; confirme na documentação): a capa clicada na estante viaja até o topo da página do livro, e o título acompanha. Sem suporte, use crossfade.
2. **Na mesma tela**, `layoutId` e `layout` do Motion: indicador das abas e do controle segmentado, troca entre as visualizações Estante, Grade e Lista, filtros entrando e saindo, card de coleção que se expande.
3. **Entradas**: fade + 8px para cima + blur de 4px para 0, em sequência de 35ms entre itens, só na primeira vez que entram na tela.
4. **Capa ao passar o mouse**: inclinação 3D que segue o cursor (useMotionValue + useSpring, até 6°) e um reflexo de luz suave.
5. **Lombada ao passar o mouse**: sai alguns pixels da prateleira e as vizinhas se afastam um pouco, como numa estante de verdade.
6. **Copiar livro**: um clone da capa voa em curva até o ícone da estante na barra superior, que dá um pulinho. O contador muda com NumberFlow e aparece o toast "Na sua estante · Desfazer".
7. **Botões**: encolhem levemente ao clicar (scale 0.97). Textos que mudam ("Seguir" → "Seguindo") usam AnimatePresence com mode="popLayout".
8. **Títulos da landing**: revelação palavra por palavra, saindo do desfoque.
9. **Rolagem**: Lenis em toda a aplicação. Na landing, animações ligadas à rolagem com useScroll e useTransform.
10. **Modais, drawers e paleta de comandos**: entram com escala de 0.96 para 1 + fade e saem mais rápido do que entram.
11. **Carregamento e ações**: skeletons discretos com shimmer e atualização otimista em toda ação (curtir, seguir, mudar status, reordenar).

## 4. Capas, lombadas e estante

- `<BookCover>`: usa a capa real quando existe. Quando não existe, gera uma capa tipográfica minimalista: cor sólida derivada do título, título em Instrument Serif e autor em Geist Mono. Tem uma leve sombra interna na borda esquerda, imitando a dobra.
- Ao salvar um livro, extraia a cor dominante da capa e guarde em `cover_color`.
- `<BookSpine>`: usa a `cover_color`, tem o título na vertical com contraste automático, largura proporcional ao número de páginas (com limites) e altura levemente variada, determinada pelo id.
- `<Shelf>`: prateleira minimalista, sem madeira. As lombadas ficam apoiadas sobre uma linha fina e quebram em várias prateleiras conforme o tamanho da tela.

## 5. Páginas e fluxos

### 5.1 Landing (/)

Uma narrativa conduzida pela rolagem:

1. Topo: frase curta em Instrument Serif ("Sua vida de leitor, em uma estante só.") e o botão "Criar minha estante". Capas reais flutuam soltas em profundidade e reagem de leve ao mouse.
2. Ao rolar, as capas viram lombadas e se encaixam numa prateleira, que então se transforma num perfil de verdade.
3. Três recursos (Organize, Descubra, Compartilhe), cada um com uma mini-demonstração viva feita com os próprios componentes do app.
4. Coleções públicas reais do banco, num carrossel arrastável.
5. Chamada final e rodapé simples.

Quem já está logado e acessa `/` vai direto para `/inicio`.

### 5.2 Conta

- `/entrar` e `/cadastro`: cartão central minimalista com e-mail e senha, link mágico e Google (Supabase Auth). Validação nos campos e mensagens de erro gentis.
- `/onboarding`: passos com transição deslizante e pontos de progresso.
  1. Nome, @usuário (disponibilidade verificada com debounce) e avatar (enviado ao Storage, com recorte).
  2. Gêneros favoritos.
  3. Primeiros livros, adicionados pela busca.
  4. Sugestões de leitores para seguir.

### 5.3 Início (/inicio)

- "Lendo agora": faixa horizontal com capas e progresso. Tocar numa capa abre um popover para atualizar a página atual.
- Feed de quem você segue, com atividades agrupadas ("Ana adicionou 3 livros a Quero ler"), capas clicáveis e opção de copiar direto do feed. Scroll infinito.
- Com o feed vazio, mostre sugestões de leitores e coleções populares.

### 5.4 Perfil e estante (/@usuario)

O perfil e a estante são a mesma página.

- Cabeçalho: avatar, nome, @usuário, bio curta, gêneros e contadores em mono (livros · coleções · seguidores · seguindo). Botão "Editar perfil" no seu perfil ou "Seguir" no de outra pessoa.
- Abas: Estante · Coleções · Citações.
- Na aba Estante:
  - controle segmentado de status: Todos · Lido · Lendo · Quero ler · Abandonado;
  - busca, filtros (gênero, nota, ano) e ordenação;
  - três visualizações com transição animada entre elas: Estante (lombadas), Grade (capas) e Lista (tabela compacta).
- Em "Quero ler", o botão "Sortear próxima leitura" embaralha as capas como cartas e revela uma delas.
- No perfil de outra pessoa:
  - "Afinidade literária" em % e "N livros em comum" (clicar filtra a estante por eles);
  - botão "Copiar" ao passar o mouse em cada livro, que abre um popover para escolher o status (padrão: Quero ler) e a coleção;
  - selo "Na sua estante" nos livros que você já tem.
- Perfil privado: quem não segue vê só o cabeçalho, e seguir exige aprovação.

### 5.5 Adicionar livro

Abre pelo botão +, pelo ⌘K ou pela tecla N, em formato de paleta de comandos:

1. A pessoa digita e a busca na Open Library mostra resultados instantâneos (capa, título, autor, ano), navegáveis pelo teclado.
2. Ao escolher um livro, aparece um passo compacto: status, nota (com meia estrela), data e coleção. Enter salva.

- Alternativas: escanear o código de barras do livro com a câmera do celular, ou "Cadastrar manualmente", com formulário completo e pré-visualização ao vivo da capa gerada.
- Livros cadastrados manualmente entram no catálogo e outras pessoas podem copiá-los.

### 5.6 Página do livro (/livro/[id])

- No topo do fundo, um brilho muito sutil da `cover_color` (cor ambiente, como no Apple Music).
- Capa com inclinação, título, autores, linha de metadados em mono e sinopse com "ler mais" (altura animada).
- Seu bloco: status, nota, datas, página atual, resenha (campo que cresce com o texto e salva sozinho, com um indicador sutil) e citações com a página.
- Comunidade: quem leu (avatares empilhados), resenhas públicas e coleções que têm o livro.
- Ações: Ver em 3D · Adicionar à coleção · Copiar para minha estante · Remover.
- Cada citação pode virar uma imagem para compartilhar (next/og), com a cor da capa.

### 5.7 Visualizador 3D

Abre em tela cheia, com a capa viajando até a posição do livro 3D. Usa React Three Fiber + drei, importados com next/dynamic (sem SSR) e carregados só quando o visualizador abre.

- Modelo: miolo de páginas com textura de borda de papel, capa e contracapa com a imagem real (ou a capa gerada) e lombada com o título. Espessura definida pelo número de páginas.
- Iluminação de estúdio suave (Environment/Lightformers), ContactShadows no chão e leve brilho na capa.
- Controles: arrastar para girar, com mola e retorno suave (PresentationControls); zoom pelo scroll ou pinça; duplo clique para voltar à posição inicial; setas do teclado também giram.
- "Abrir": a capa gira pela dobra com mola e revela a folha de rosto, com título, autor, sinopse e uma citação da comunidade. Se der tempo, permita folhear algumas páginas com curvatura (bones/skinning).
- No celular, inclinar o aparelho gira levemente o livro (DeviceOrientation, pedindo permissão).
- Interface: pílula flutuante com Girar · Abrir · Resetar · Fechar (Esc).

### 5.8 Coleções (/colecao/[id])

- Criar e editar: título, descrição, emoji, visibilidade (pública ou privada) e opção colaborativa, com convite por @usuário.
- Capa da coleção: de 3 a 5 capas em leque, que se abre com mola ao passar o mouse.
- Página da coleção: cabeçalho e livros em grade, reordenáveis pelo dono e pelos colaboradores (dnd-kit, com animação de layout fluida), cada um com uma nota opcional ("por que está aqui").
- Ações: curtir, salvar, compartilhar (com imagem OG dinâmica) e "Copiar coleção", que faz uma cópia com o crédito "Inspirado em @fulano" e guarda a origem.

### 5.9 Explorar (/explorar)

- Busca única com abas: Livros · Leitores · Coleções (full-text do Postgres + pg_trgm).
- Seções: Coleções populares, Livros mais adicionados na semana e Leitores com afinidade com você.

### 5.10 Notificações e configurações

- Notificações num popover, em tempo real (Supabase Realtime): novo seguidor, pedido para seguir, curtida e cópia de coleção, convite para coleção colaborativa.
- `/configuracoes`: perfil, conta, privacidade, tema, importar biblioteca do Goodreads (CSV), exportar meus dados (CSV ou JSON) e excluir conta.

### 5.11 Paleta de comandos (⌘K)

Busca global (livros, pessoas, coleções e a sua estante) e ações: Adicionar livro, Nova coleção, Ir para…, Alternar tema e Sortear próxima leitura. Mostre os atalhos de teclado.

## 6. Modelo de dados (Supabase)

Migrations em `supabase/migrations` e tipos gerados com `supabase gen types`. RLS ativa em **todas** as tabelas.

Tabelas:

- `profiles`: id (= auth.users.id), username (único, minúsculo), display_name, bio, avatar_url, favorite_genres text[], is_private, created_at. Criado por trigger no cadastro.
- `books` (catálogo compartilhado): id, title, subtitle, authors text[], description, page_count, published_year, isbn_13, isbn_10, language, genres text[], cover_url, cover_color, source ('openlibrary' | 'google' | 'manual'), source_id, created_by, created_at. Únicos: (source, source_id) e isbn_13.
- `user_books`: id, user_id, book_id, status ('read' | 'reading' | 'want' | 'abandoned'), rating (de 0.5 a 5), review, started_at, finished_at, current_page, copied_from_user_id, created_at, updated_at. Único: (user_id, book_id).
- `quotes`: id, user_id, book_id, text, page, created_at.
- `collections`: id, owner_id, title, description, emoji, visibility ('public' | 'private'), is_collaborative, copied_from_id, created_at, updated_at.
- `collection_items`: collection_id, book_id, position (índice fracionário, para reordenar sem custo), note, added_by, added_at.
- `collection_members`: collection_id, user_id, role.
- `follows`: follower_id, following_id, status ('accepted' | 'pending'), created_at.
- `collection_likes` e `collection_saves`: user_id, collection_id, created_at.
- `activities`: id, actor_id, type, book_id, collection_id, target_user_id, created_at. Preenchida por triggers.
- `notifications`: id, user_id, actor_id, type, refs, read_at, created_at.

Também:

- Função SQL `reading_affinity(a, b)`, que pondera livros em comum e gêneros, e uma view com os livros em alta na semana.
- Storage: buckets `avatars` e `covers`, com políticas por dono.
- Seed (`supabase/seed.sql`): cerca de 8 leitores de exemplo com gostos diferentes, uns 40 livros reais (Dom Casmurro, A Hora da Estrela, Torto Arado, Grande Sertão: Veredas, 1984, Duna, O Hobbit, Cem Anos de Solidão, Ensaio sobre a Cegueira, Sapiens…), coleções, resenhas, citações e follows, para a interface já nascer com conteúdo.

Regras de acesso:

- Perfis e estantes públicos podem ser lidos por todos; os privados, só por seguidores aceitos.
- Só o dono escreve nos próprios dados.
- Coleções privadas são visíveis só para o dono e os membros; os membros podem adicionar e reordenar itens.

## 7. Arquitetura

- Server Components por padrão. Client Components só onde há interação ou animação.
- Leitura de dados no servidor. Mutações por Server Actions validadas com zod, que retornam erros tipados; a UI do cliente se atualiza de forma otimista.
- Clientes Supabase separados (`lib/supabase/server.ts` e `client.ts`), com renovação da sessão no proxy ou middleware, conforme a versão do Next.
- Rota `/@usuario`: no App Router, pastas que começam com @ são slots de rotas paralelas. Por isso, crie `app/u/[username]` e use um rewrite de `/@:username` para lá.
- Código organizado por funcionalidade (`features/books`, `features/collections`, `features/social`…), com os componentes primitivos em `components/ui`.
- Metadados, imagens OG dinâmicas (perfil, coleção, livro e citação) e sitemap das páginas públicas.
- Variáveis de ambiente documentadas em `.env.example`. Nunca exponha a chave secreta no cliente.

## 8. Qualidade

- Acessibilidade: navegação completa por teclado, foco visível, aria-labels, contraste AA e respeito ao prefers-reduced-motion.
- Performance: Lighthouse ≥ 90 no celular, LCP < 2,5s, CLS perto de zero, three.js fora do bundle inicial e imagens com next/image nos tamanhos certos.
- Estados: todo componente tem estado de carregando, vazio (ilustração minimalista em traço fino + uma ação), erro e sucesso.
- Responsivo de 360px a 1920px.

## 9. Testes

- Vitest: utilitários (afinidade, índice fracionário, normalização dos dados da Open Library).
- Playwright: cadastro e onboarding, adicionar livro, criar e reordenar coleção, seguir alguém e copiar livro e coleção de outro perfil, abrir o visualizador 3D.

## 10. Deploy

- GitHub → Vercel, com previews por branch e as variáveis configuradas no painel da Vercel.
- No Supabase, configure as URLs de redirecionamento do Auth (localhost, previews e produção) e o provedor Google.
- Ative o Analytics e o Speed Insights.

## 11. Fases

0. **Plano**: arquitetura, pastas, versões e CLAUDE.md. Espere minha aprovação.
1. **Fundação**: projeto Next, tokens, fontes, tema, shadcn restilizado, presets de movimento, Lenis, barra de navegação, BookCover, BookSpine, Shelf e uma página /dev que mostra todos os componentes e animações.
2. **Supabase e conta**: schema, RLS, triggers, storage, seed, tipos, login (e-mail, link mágico, Google) e onboarding.
3. **Estante**: busca na Open Library, adicionar e editar livros, perfil com as 3 visualizações, filtros e página do livro com a transição compartilhada.
4. **Coleções**: criar, editar, reordenar, colaborativas, curtir, salvar e copiar.
5. **Social**: seguir, perfis privados, explorar, afinidade, copiar livros, feed e notificações em tempo real.
6. **Visualizador 3D.**
7. **Toques finais de produto**: landing com narrativa de rolagem, ⌘K completo, sortear próxima leitura, scanner de ISBN, imagens OG e importação do Goodreads.
8. **Polimento e QA**: revisão de todas as animações, acessibilidade, performance, testes Playwright e deploy na Vercel.
