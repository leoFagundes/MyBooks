# MyBooks: plano de melhorias

O MyBooks já foi construído seguindo o SPEC.md. Este documento organiza em fases as correções, os ajustes e as novas funcionalidades. Continuam valendo as convenções do CLAUDE.md e as regras de design e movimento do SPEC.md.

## Regras

- Uma fase por vez. No início de cada fase, leia o código relevante, apresente um plano curto e siga em frente. Só pare para pedir aprovação nos pontos marcados com ⏸.
- Bugs: reproduza o problema, encontre a causa raiz e explique-a em uma frase antes de corrigir. Não mascare sintomas.
- Banco de dados: crie novas migrations (nunca edite as antigas), ative RLS em toda tabela nova e regenere os tipos.
- Movimento: use os presets de `lib/motion.ts`, respeite o reduced motion e mantenha a meta de 60fps.
- Ao fim de cada fase:
  - rode typecheck, lint, build e testes;
  - crie ou atualize os testes Playwright dos fluxos novos;
  - me diga o que testar manualmente;
  - faça um commit;
  - atualize o CLAUDE.md se surgiu alguma convenção nova.
  - A medida que for desenvolvendo, me de, constantemente, a fase em que estamos e a porcentagem de conclusão daquela fase
  - Vamos evitar gatsar tokens em testes por enquanto, apenas em casos mais necessários.
  - Se algum item abaixo já estiver resolvido por dar como resolvido depois de verificar se está tudo certo.

---

## Fase 1: correções e responsividade

### 1.1 Responsividade

- Problema: em telas pequenas, a nota em "Sua leitura" corta o texto "x estrelas", e há outros elementos esmagados ou desalinhados.
- Corrija esse caso fazendo o layout quebrar linha em vez de comprimir: flex-wrap, min-w-0, estrelas com tamanho fixo e rótulo abaixo delas no celular.
- Depois, faça uma auditoria com um script Playwright que:
  - tira screenshots de todas as rotas em 360, 390, 768, 1024 e 1440px, nos temas claro e escuro;
  - detecta rolagem horizontal (document.scrollWidth > innerWidth) e texto truncado.
- Corrija tudo o que aparecer e me entregue a lista do que foi corrigido.
- Aceite: nenhuma página tem rolagem horizontal ou texto cortado a partir de 360px.

### 1.2 Animação de navegação que às vezes não acontece (ida e volta)

Investigue as causas mais comuns de falha das View Transitions e corrija as que se aplicarem:

- **view-transition-name duplicado na página.** O mesmo livro aparece em dois lugares (ex.: "Lendo agora" e a estante), e o navegador cancela a transição inteira. Gere nomes únicos e aplique o nome só no elemento clicado, no momento do clique.
- **Destino ainda carregando.** O loading.tsx ou um Suspense mostra um skeleton sem o elemento nomeado. A capa e o título precisam renderizar já no primeiro frame do destino.
- **Na volta, o elemento ainda não existe.** Ele está fora da tela, ainda não foi montado (lazy ou virtualização) ou a restauração da rolagem acontece depois do snapshot.
- **Clique durante uma transição em andamento.**
- **Imagem com src diferente entre as duas páginas.**

Em desenvolvimento, registre no console quando uma transição for pulada e o motivo. Teste ida e volta em 20 livros vindos de lugares diferentes: estante, grade, lista, feed, coleção e explorar.
Aceite: a transição acontece em todos os casos testados, com crossfade nos navegadores sem suporte.

### 1.3 Capa já carregada na página do livro

- Causa provável: a página de detalhes pede outra URL de imagem (um tamanho maior da Open Library, ex.: -M → -L, ou outra largura do next/image), e essa URL não está em cache.
- Correção:
  - mostre imediatamente a mesma imagem que já estava na tela (mesma URL);
  - troque pela versão em alta com crossfade quando ela terminar de carregar;
  - pré-carregue a versão grande no hover ou foco do livro;
  - use priority na capa do topo.
- Aceite: ao clicar num livro, a capa nunca aparece vazia nem pisca.

### 1.4 Toast com barra de carregamento

- Problema: ao adicionar um livro, a barra de carregamento dentro do alerta perde a responsividade.
- Verifique as duas hipóteses:
  - a barra trava porque a thread principal está ocupada (ex.: extração de cor da capa no cliente);
  - a barra quebra o layout em telas pequenas.
- Correção:
  - anime a barra com transform: scaleX, que roda no compositor e continua fluida mesmo com o JS ocupado;
  - largura relativa ao toast;
  - trabalho pesado no servidor;
  - um único toast usando o fluxo de promessa do sonner (carregando → sucesso ou erro).
- Aceite: barra fluida e dentro do toast em 360px e no desktop.

### 1.5 Estado vazio da tela inicial

- Problema: a linha do SVG passa da base.
- Redesenhe a ilustração: traço fino e minimalista, mesma espessura de traço do restante do app, viewBox correto e pontas arredondadas, com uma animação sutil de desenho do traço (pathLength) ao aparecer.
- Revise os outros estados vazios para seguirem o mesmo padrão.

---

## Fase 2: visualizações e capas

### 2.1 Modo Estante e transições entre os três modos

<!-- nao entendi esse item então comentei - Adicione o modo Estante (lombadas sobre uma linha fina, com BookSpine e Shelf) ao seletor Grade · Lista · Estante. -->

- Na troca de modo, cada livro mantém a mesma identidade (layoutId) nos três modos:
  - a forma muda com animação de layout (capa ↔ lombada ↔ linha da lista);
  - o conteúdo interno faz crossfade (a imagem da capa some enquanto o título vertical da lombada aparece);
  - aplique um stagger leve.
- Performance e acessibilidade:
  - anime com layout só os itens visíveis na tela; os demais trocam sem animação;
  - teste com 300 livros mantendo 60fps;
  - com reduced motion, use só fade.
- Mantenha a rolagem ancorada no livro que estava no topo da tela.
- Aceite: as 6 combinações de troca são fluidas e sem saltos.

### 2.2 Lembrar a visualização escolhida

- Salve a escolha em um cookie lido no servidor, para a página já renderizar no modo certo, sem piscar.
- Para quem está logado, salve também no perfil (`profiles.preferences` jsonb), sincronizando entre dispositivos. Ao entrar na conta, o valor do perfil atualiza o cookie.

### 2.3 Cor de capa personalizada

- No cadastro e na edição de um livro sem imagem, ofereça:
  - uma paleta curada de 12 cores que funcionam nos dois temas;
  - um seletor livre (hex);
  - a escolha do estilo da capa gerada.
- Quero pdoer, na hora da criação do livro, colocar a imagem da capa também.
- Pré-visualização ao vivo em capa, lombada e 3D, usando a mesma cor.
- Contraste do texto calculado automaticamente (WCAG).
- A cor fica salva em `cover_color`.

---

## Fase 3: 3D

### 3.0 Componente compartilhado

Extraia o modelo do livro para um componente único (ex.: `<BookModel>`), usado pelo visualizador e pela landing.

### 3.1 Visualizador: a capa atravessa as páginas ao fechar

- Causas prováveis:
  - a mola de fechamento passa do ângulo 0 (overshoot causado pelo bounce);
  - o pivô da capa está fora da dobra;
  - a capa não tem folga em relação ao miolo.
- Correção:
  - pivô exatamente na dobra;
  - ângulo limitado (clamp) entre 0 e o máximo, com a mola de fechamento sem overshoot;
  - miolo levemente menor que a capa, como num livro real, com uma folga mínima;
  - verifique o mesmo na contracapa e nas páginas folheáveis.
- Aceite: abrir e fechar 20 vezes seguidas, inclusive interrompendo no meio do movimento, sem nenhuma interseção.

### 3.2 Livros sem capa no 3D

- Gere a textura a partir do mesmo design do BookCover (CanvasTexture com cor, título, autor e estilo), em alta resolução. Faça o mesmo para a lombada e para a contracapa, com a sinopse curta.
- Carregue as capas externas por uma rota própria (proxy com cache), para evitar erros de CORS no WebGL.
- Se a imagem falhar, use a capa gerada sem quebrar a cena.

### 3.3 Livros 3D da landing

- Problemas: alguns livros parecem chapados, sem volume, durante a animação de rolagem, e eles seguem o mouse.
- Todos os livros da landing viram objetos 3D reais com espessura (`<BookModel>`), numa única cena R3F.
- **Movimento próprio:** cada livro flutua e gira devagar, com fase, velocidade e amplitude próprias (ruído suave, nada sincronizado). Remova o seguimento do mouse.
- **Rolagem:**
  - o progresso da rolagem (Lenis) conduz a transição para a estante, com amortecimento (ex.: easing.damp da biblioteca maath), para continuar fluido mesmo com rolagem brusca;
  - rotações interpoladas por quaternion (slerp), para nenhum livro girar "pelo lado errado";
  - poses escolhidas para mostrar sempre o volume: nenhum livro fica de perfil chapado para a câmera.
- Iluminação suave e sombra de contato coerentes com o visualizador.
- **Performance:**
  - a cena carrega depois do texto do topo da página, sem atrasar o LCP;
  - texturas pequenas e comprimidas, dpr limitado;
  - render pausado quando a cena está fora da tela;
  - menos livros no celular;
  - imagem estática com reduced motion.
- Aceite: 60fps num notebook comum, fluido num celular intermediário e nenhum livro chapado em qualquer ponto da rolagem.

---

## Fase 4: login com Google

- Já foi imp´lementado no supabse, pode passar para a próxima fase após o consentimento do dev.

---

## Fase 5: explorar e catálogo

### 5.1 ⏸ Avaliação de novas fontes de livros

Pare e me apresente o relatório antes de integrar qualquer coisa.

- Candidatas:
  - **Google Books:** boa cobertura de edições brasileiras e sinopses em português; exige chave; a cota padrão é baixa (em torno de 1.000 requisições por dia).
  - **BrasilAPI (ISBN):** gratuita; consulta CBL, Mercado Editorial, Open Library e Google Books; boa para busca por ISBN e para o scanner.
  - **Hardcover:** exige token pessoal; provavelmente inadequada para produção.
  - **ISBNdb:** paga.
- Teste com 30 títulos (15 brasileiros, 10 internacionais traduzidos, 5 pouco conhecidos) e compare cada fonte nestes critérios: encontrou o livro, capa, sinopse em português, número de páginas, ISBN-13 e tempo de resposta. Entregue uma tabela e uma recomendação.
- Se eu aprovar, implemente uma busca federada:
  - catálogo interno primeiro (resultado instantâneo);
  - fontes externas em paralelo, no servidor, com timeout;
  - deduplicação por ISBN-13 e por título + autor normalizados;
  - mesclagem dos melhores campos de cada fonte;
  - cache das respostas;
  - Open Library com User-Agent identificado (nome do app e contato), o que triplica o limite de requisições.

### 5.2 Origem do livro nos resultados de busca

- Cada resultado mostra um selo discreto com a fonte (Open Library, Google Books…) ou "Cadastrado por @usuário" (clicável) nos livros manuais.
- Indique quando o livro já está no catálogo do MyBooks e quantas pessoas o têm na estante.

### 5.3 Explorar

- **Busca:** barra no topo da página, usando a busca federada, com as abas Livros · Leitores · Coleções.
  - resultados instantâneos;
  - termo salvo na URL (?q=), para compartilhar e para voltar sem perder a busca.
- **Sem termo digitado:** grade "Populares e descobertas", que mistura os livros mais adicionados no MyBooks com as tendências da Open Library e assuntos por gênero.
  - o botão "Ver mais" carrega a próxima página, sem repetir livros;
  - ordem aleatória com uma semente fixa por sessão, para a lista não mudar quando a pessoa volta;
  - filtro por gênero em chips.

### 5.4 Gêneros personalizados

- Troque `favorite_genres text[]` por duas tabelas e migre os dados existentes:
  - `genres`: id, name, slug (único, normalizado sem acentos nem maiúsculas), is_official, status, created_by;
  - `user_favorite_genres`.
- Ao digitar um gênero que não existe, o combobox oferece "Criar 'X'". Regras:
  - limite de tamanho e filtro de palavrões;
  - verificação de semelhança: quem digitar "ficcao cientifica" recebe a sugestão "Ficção científica".
- Um gênero novo fica disponível na hora para quem o criou, com status pending. Só aparece para todos depois de aprovado por um admin (tela na Fase 7).
- Favoritar e desfavoritar gêneros no perfil e nas configurações.

### 5.5 Sorteio da próxima leitura com filtro de gênero

- Chips com os gêneros presentes na lista Quero ler, com contagem e seleção múltipla.
- Se o filtro deixar só 1 livro, avise de forma simpática.
- Mantenha a animação de embaralhar.

---

## Fase 6: painel administrativo (fundação)

- **Papéis:** tabela `user_roles` (user_id, role: admin | moderator) sem escrita pelo cliente, alterada só por SQL ou pelo painel do Supabase. As funções `is_admin()` e `is_moderator()` (security definer) são usadas nas políticas RLS. Nunca use uma coluna editável do perfil para isso.
- **Proteção do /admin em três camadas:** proxy/middleware, layout no servidor e verificação dentro de cada Server Action. A rota fica fora do sitemap e com noindex.
- Operações privilegiadas (banir, excluir conta) rodam só no servidor, com a chave secreta.
- **Telas:**
  - **Visão geral:** novos usuários (dia, semana, mês), usuários ativos, livros e coleções criados, itens pendentes nas filas e um gráfico simples de crescimento.
  - **Usuários:** busca, perfil resumido, suspender ou banir (com motivo e prazo), remover conteúdo, promover a moderador.
  - **Configurações do site:** banner de aviso, modo manutenção e funcionalidades liga/desliga (feature flags em `site_settings`).
  - **Auditoria:** registro de toda ação administrativa (quem, o quê, quando, antes e depois).
- Visual minimalista, layout de painel com barra lateral e tabelas com TanStack Table (ordenação, filtros e paginação no servidor).
- Me diga o comando SQL para eu me tornar admin.

---

## Fase 7: moderação do catálogo

### 7.1 Livros cadastrados manualmente

- Nova coluna `books.moderation_status` (pending | approved | rejected).
- Um livro manual aparece na hora na estante de quem o criou, mas só entra na busca pública depois de aprovado.
- Tela no admin com os novos livros manuais: capa, dados, criador, data e quantas pessoas já o adicionaram.
  - Ações: aprovar, editar e aprovar, rejeitar (com motivo) e "é duplicado de…" (mesclar).
- Notifique o criador sobre o resultado.

### 7.2 Sugestões de edição e de exclusão

- Na página do livro:
  - **"Sugerir edição":** formulário já preenchido, que salva só os campos alterados e o motivo;
  - **"Sugerir exclusão":** motivos como duplicado (indicando de qual livro), conteúdo impróprio, livro inexistente ou outro.
- Tabela `book_change_requests`: book_id, user_id, type (edit | delete | merge), changes jsonb, base_snapshot jsonb, reason, status, reviewed_by, reviewed_at, review_note.
- Fila no admin:
  - diff lado a lado, campo por campo (antes → depois);
  - aviso quando o livro mudou depois da sugestão;
  - aprovar aplica a mudança numa transação, via função SQL;
  - rejeitar exige uma nota;
  - quem sugeriu é notificado.
- Exclusão é lógica (`deleted_at`).
- Duplicado = mesclar:
  - mova user_books, collection_items, citações e discussões para o livro mantido;
  - resolva conflitos (ex.: o mesmo usuário com os dois livros);
  - redirecione a URL antiga.
- Limite de sugestões pendentes por usuário, contra spam.
- A mesma fila inclui os gêneros personalizados pendentes (Fase 5.4).

---

## Fase 8: comunidade

### 8.1 Fórum (/comunidade)

- **Categorias:** Geral, Recomendações, Clubes de leitura, Discussões de livros e Ajuda, gerenciáveis pelo admin.
- **Tópicos:**
  - título;
  - corpo em Markdown leve (negrito, itálico, links, citações, listas), sempre sanitizado;
  - livros vinculados (opcional) e tags.
- **Respostas:** um nível de aninhamento, com opção de citar outra resposta.
- **Menções:** @usuário e livros (o livro vira um card).
- **Spoilers:** marcação `||spoiler||`, que fica borrada até o clique. Tópicos sobre um livro podem ser marcados "contém spoilers".
- **Reações:** curtir e "útil".
- **Ordenação:** atividade recente, populares e sem resposta.
- **Página do livro:** ganha a seção "Discussões", com os tópicos vinculados a ele.
- **Notificações:** respostas ao seu tópico e menções; opção de seguir um tópico.
- **Moderação:**
  - qualquer usuário pode denunciar, escolhendo o motivo; a denúncia vai para a fila do admin;
  - admins e moderadores podem fixar, trancar, mover e ocultar;
  - o autor pode editar (com marca "editado") e excluir.
- **Anti-spam:**
  - limite de publicações por minuto, aplicado no banco;
  - limite menor para contas muito novas;
  - links bloqueados nos primeiros posts.
- **Visual:** minimalista e editorial, com lista limpa e tipografia confortável para textos longos.
- **Animações:**
  - o editor de publicação abre em modal ou drawer;
  - uma nova resposta entra com animação de layout;
  - reações com "pop".

### 8.2 Central de sugestões (/sugestoes)

- Botão "Enviar sugestão" em Configurações; a página pública `/sugestoes` mostra todas.
- **Campos:** título, descrição e categoria (Funcionalidade, Melhoria, Bug, Outro).
- Ao digitar o título, aparecem sugestões parecidas (pg_trgm), para a pessoa votar nelas em vez de criar uma duplicada.
- **Interação:**
  - votos (um por usuário, com NumberFlow);
  - comentários simples;
  - ordenação por mais votadas ou mais recentes;
  - filtro por status.
- **Status definidos pelo admin:** Nova, Em análise, Planejada, Em andamento, Concluída e Recusada, com resposta oficial em destaque. Quem votou é notificado quando o status muda.
- Reaproveite os componentes do fórum: editor, votos, denúncia e moderação.

---

## Fase 9: PWA, créditos e acabamento

### 9.1 Instalar o app (PWA)

- **Manifest** em `app/manifest.ts`:
  - nome;
  - ícones em todos os tamanhos, incluindo maskable;
  - theme_color dos dois temas;
  - display standalone;
  - screenshots.
- **Service worker** com Serwist: cache dos assets e uma página offline elegante.
- **Botão "Instalar o app"** em Configurações. Quem acessa pelo celular também vê um aviso discreto, uma única vez.
  - Android, Chrome e Edge: capture o evento beforeinstallprompt e abra o diálogo nativo.
  - iPhone e iPad: o Safari não tem esse evento, então mostre um modal com o passo a passo ilustrado (Compartilhar → Adicionar à Tela de Início).
  - Esconda o botão quando o app já estiver instalado (display-mode: standalone).
- **Ajustes de app:**
  - safe areas do notch;
  - ícones e splash para Apple;
  - nada de zoom indesejado ao tocar em campos de texto.

### 9.2 Página de créditos (/readme)

- Avaliação de segurança: listar a stack não cria vulnerabilidade por si só. Next.js e Vercel já são detectáveis pelos cabeçalhos HTTP, e a URL e a chave pública do Supabase já estão no código do navegador por design. O risco está nos detalhes.
- **Pode entrar:**
  - nomes das tecnologias, bibliotecas e serviços (Next.js, Supabase, Vercel, Resend…), com links e licenças;
  - as atribuições exigidas pelas fontes de dados (Open Library, Google Books).
- **Não pode entrar:** versões exatas, nomes de tabelas, rotas internas (/admin), variáveis de ambiente, endpoints, configurações de segurança e e-mails internos.
- Gere a lista de bibliotecas a partir do package.json durante o build, só com nome, licença e link, sem versões.
- Configure Dependabot ou Renovate para manter as dependências atualizadas. É isso que de fato protege o projeto.

### 9.3 Termos de uso e privacidade

- Com fórum, conteúdo de usuários e login com Google, o site precisa de `/termos` e `/privacidade` (LGPD: dados coletados, finalidade, exclusão de conta e contato).
- Coloque os links no rodapé, no cadastro e na tela de consentimento do Google.
- Gere um rascunho e marque os trechos que eu preciso revisar.

### 9.4 QA final

- Rode de novo a auditoria de responsividade da Fase 1, incluindo todas as páginas novas.
- Testes Playwright dos fluxos novos: fórum, sugestões, moderação e PWA.
- Lighthouse ≥ 90 e revisão de acessibilidade.
- Testes das políticas RLS das tabelas novas, confirmando que um usuário comum:
  - não lê nem escreve o que não deve;
  - não consegue se tornar admin.
