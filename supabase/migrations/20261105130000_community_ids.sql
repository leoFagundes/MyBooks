-- O cliente pode escolher o id do tópico e da resposta (como já faz no
-- catálogo): o app abre a página certa sem esperar a volta do insert
grant insert (id) on table public.forum_topics to authenticated;
grant insert (id) on table public.forum_replies to authenticated;
