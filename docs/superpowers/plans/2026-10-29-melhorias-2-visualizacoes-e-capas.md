# Melhorias, Fase 2: visualizações e capas

Branch `melhorias-2-visualizacoes-e-capas`, a partir da `master` (com a Fase 1 das melhorias integrada). Itens 2.1, 2.2 e 2.3 do [MELHORIAS.md](../../../MELHORIAS.md).

## Decisões

1. **A identidade do livro entre as vistas é um nome de View Transition (`vista-<id>`), não o `layoutId` do Motion.** A troca de vista passa a ser uma transição do React (`startTransition` + tipo), e cada capa, lombada e miniatura da lista leva o mesmo nome. Por quê:
   - a rolagem ancorada precisa de coordenadas de tela: o Motion mede a página, e rolar entre a medida de antes e a de depois faria tudo saltar;
   - o voo roda no compositor (60fps mesmo com a thread ocupada);
   - o React só nomeia o que está na tela: anima só o que se vê, e o resto troca no crossfade da página, sem custo.
     Exceção documentada à regra "dentro da mesma tela, Motion".
2. **As formas:** Grade ↔ Lista, a capa voa e muda de tamanho (classe `vista-capa`); da Estante para Grade ou Lista, a lombada gira pela quina até virar a capa (`vira-capa`, o mesmo giro da ida à página do livro); e de volta, `vira-lombada`. As classes ganham `troca`, para o que só vale na troca de vista.
3. **Stagger:** 35ms por livro na ordem de leitura, com teto de 210ms no total, numa folha de estilo posta no clique (o `animation-delay` de cada nome). Atrasar pelo JS no `onShare` foi a primeira versão e travava a página com 48 livros (cada `getAnimations()` varre todas as animações). Viajam no máximo 48 livros; o resto troca no crossfade da página.
4. **Rolagem ancorada:** o primeiro livro visível abaixo da barra fica no mesmo lugar da tela. Mede no clique; corrige a rolagem no layout effect, antes de a transição medir a vista nova.
5. **Movimento reduzido:** só fade (o CSS de movimento reduzido já cobre as classes; entra a nova). **Sem View Transitions no navegador:** a vista nova entra com fade do Motion. **Landing:** a troca automática da demonstração usa o fade; o clique usa a transição.
6. **Lembrar a vista:** cookie `mybooks-vista` (um ano), escrito no cliente a cada troca e lido pelo servidor dentro do Suspense da aba Estante: o HTML já vem na vista certa. O `?vista=` deixa de ser escrito, mas ainda vale (links antigos) e vence o cookie. Uma memória no cliente cobre o cache do roteador (5 minutos), que traria a vista antiga.
7. **Preferências no perfil: tabela `profile_preferences` (jsonb), não `profiles.preferences`.** O perfil é público (qualquer um lê todas as colunas); a preferência é só da pessoa (RLS da própria linha). Gravação por `merge_preferences(patch)`, com debounce. Ao entrar (senha, link mágico, Google: `destinationAfterSignIn`), o valor do perfil reescreve o cookie.
8. **Estilos da capa gerada:** Clássica (a de hoje), Moldura (fio fino em volta, título e autoria centrados), Faixa (uma faixa de papel com o título, à Penguin) e Mínima (autoria no alto, título grande embaixo). Coluna `books.cover_style` (null é Clássica). O mesmo desenho na capa (CSS), na lombada, no 3D (canvas), nas imagens de compartilhamento e na landing.
9. **Paleta curada de 12 cores** (vinho, terracota, mostarda, oliva, floresta, petróleo, marinho, cobalto, índigo, ameixa, rosa antigo e grafite), em RGB no TS (o design-rules barra hex solto), escolhidas para ter contraste com o fundo nos dois temas e AA com a tinta sem ajuste. Mais a "Automática" (a cor do título, como hoje) e o seletor livre (cor nativa + campo hex). O contraste aparece calculado pelo `coverInk` (e avisa quando o tom foi ajustado para passar no AA). Grava-se a cor escolhida em `cover_color`.
10. **Imagem no cadastro:** o navegador reduz a imagem (lado maior 1200px) e a manda à Server Action (limite de 2 MB); o servidor passa pelo `processCover` (três larguras em WebP e a cor) e grava em `covers/<id>/<versão>/`. Pasta com versão (`cover_url = covers/<id>/<versão>`): trocar a imagem gera outra URL e o cache de um ano não serve a antiga.
11. **Editar livro:** quem cadastrou um livro manual pode editá-lo (dados e capa: cor, estilo, imagem, trocar ou tirar a imagem), pelo "Editar livro" na página do livro. RLS de update para `created_by = auth.uid() and source = 'manual'`, com colunas liberadas; o `cover_url` só o servidor grava. Livros da Open Library e do Google continuam sem edição (a Fase 7 traz as sugestões).
12. **Prévia ao vivo:** Capa · Lombada · 3D no formulário. O 3D carrega só quando escolhido (o `BookModel` num canvas pequeno, girando devagar; parado com movimento reduzido).
13. **Testes:** sem suíte nova (economia de tokens, MELHORIAS). Sondas no scratchpad: a troca de vista com 300 livros no `/dev` (frames com a CPU 4×), as seis combinações, a rolagem ancorada e o cadastro com imagem. Os E2E que liam `?vista=` continuam valendo.

## Tarefas

1. Migration `20261029120000_cover_style_and_preferences.sql` (estilo, pasta com versão, edição pelo criador, `profile_preferences`, `merge_preferences`) → `db:push` → `db:types`.
2. `BookVisual.coverStyle` em todas as leituras; `toBookVisual` com a pasta versionada; loader de imagem com a versão.
3. Estilos: `features/books/lib/cover-style.ts`, `GeneratedCover` e `SpineArt` (capa e lombada), 3D (`drawGeneratedCover`, `drawSpine`), OG (`OgCover`), landing (`BookBox` usa `SpineArt`).
4. Troca de vista: `ShelfViews` com nomes, classes, stagger e âncora; `useShelfViewSwitch`; CSS (`vista-capa`, `troca`, movimento reduzido); `/dev` com 300 livros.
5. Lembrar a vista: cookie, leitura no servidor, memória no cliente, `saveShelfView`, sincronia ao entrar.
6. Cor e estilo: paleta, `CoverDesigner` (estilo, cor, contraste, imagem), prévia Capa · Lombada · 3D (`BookPreview3D`).
7. Cadastro e edição: `ManualBookForm` (criar e editar), `createManualBook` com imagem, `updateManualBook`, `EditBookButton` na página do livro.
8. Fim de fase: typecheck, lint, build, testes de design-rules e unitários existentes, sondas; CLAUDE.md; commit.
