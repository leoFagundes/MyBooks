# Melhorias, Fase 5: explorar e catálogo

Branch `melhorias-5-explorar-e-catalogo`, a partir da `main`. Itens 5.2 a 5.5 do [MELHORIAS.md](../../../MELHORIAS.md). O 5.1 (novas fontes de livros e a busca federada com elas) ficou de fora, a pedido do usuário: a busca segue com o catálogo e a Open Library (o Google Books de reserva). A Fase 4 (login com Google) já estava resolvida.

## Decisões

1. **Origem nos resultados (5.2).** `BookOrigin` (`features/books/components/book-origin.tsx`) mostra a fonte (Open Library, Google Books) ou "Cadastrado por @usuário" nos manuais e, para o que já está no catálogo, "No MyBooks · N estantes" (a view `trending_books`, que só conta as estantes que quem busca pode ver). Os dados vêm do servidor, no `catalogResults` (`withCommunity`). Na paleta o @ é texto: link dentro de uma opção de lista não chega ao teclado nem ao leitor de tela. Ele é link no passo seguinte (o do status) e no Explorar.
2. **Explorar (5.3).**
   - A aba Livros usa a busca da paleta (`useBookSearch`): o catálogo na hora, a Open Library logo depois, sem repetidos.
   - Um livro de fora entra no catálogo no clique (`openExternalBook`, uma Server Action, porque escreve) e a página dele abre. O servidor acha o livro de novo, do cache: pela busca ou pelo conjunto da grade (o `BookRef` ganhou a variante `discovery`).
   - Sem termo: a grade "Populares e descobertas" (`DiscoveryGrid`) mistura os mais adicionados no MyBooks, as tendências da semana na Open Library e assuntos por gênero (`GENRE_SUBJECTS`). O conjunto é montado e guardado no servidor (`getDiscoveryPool`, por gênero). As páginas saem de `/api/explore/discover`, embaralhadas com a semente da sessão (`sessionStorage`), por isso não se repetem e a lista não muda na volta. O gênero fica na URL (`?genero=`), junto com o `?q=` e o `?aba=` (`replaceExploreParams`).
3. **Gêneros personalizados (5.4).** Migration `20261103120000_genres.sql`:
   - `genres` (os 18 oficiais aprovados; os de leitores nascem pendentes e só quem criou os vê) e `user_favorite_genres`, com RLS e os favoritos de hoje migrados;
   - o `profiles.favorite_genres` fica como espelho mantido por trigger (só os aprovados), e ninguém o escreve: as funções de afinidade e sugestões continuam lendo um array só, e o gênero pendente não aparece para os outros. Aprovar ou recusar (Fase 7) refaz o espelho de quem o favoritou;
   - salvar é `set_favorite_genres(slugs)`; criar é `createGenre(nome)` (tamanho, palavrão, e o igual sem acento nem caixa devolve o que já existe);
   - o combobox (`GenreChips`) busca em `/api/genres` e oferece o igual, um parecido ("Você quis dizer…", distância de edição) e "Criar 'X'". O gênero criado aparece "em análise".
4. **Sorteio (5.5).** Os livros do sorteio levam os gêneros. Os chips com contagem e seleção múltipla (vale o livro com qualquer um) embaralham de novo o que sobra, e com um livro só aparece o aviso.
5. **Testes:** sem suíte nova (economia de tokens). Sondas no dev: a grade (páginas sem repetir, filtro), a paleta com o selo, o sorteio com o filtro e os gêneros (criar, sugestão, em análise).
