-- Comunidade (MELHORIAS 8): o fórum em /comunidade e a central de sugestões
-- em /sugestoes, com denúncias, avisos e o anti-spam no banco.

create table public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint forum_categories_slug_format check (private.are_slugs(array[slug])),
  constraint forum_categories_name_length check (name = btrim(name) and char_length(name) between 2 and 40),
  constraint forum_categories_description_length check (char_length(description) <= 200)
);

alter table public.forum_categories enable row level security;
create policy "categories are public" on public.forum_categories for select using (true);
revoke all on table public.forum_categories from anon, authenticated;
grant select on table public.forum_categories to anon, authenticated;

insert into public.forum_categories (slug, name, description, position) values
  ('geral', 'Geral', 'Conversa sobre leitura, de tudo um pouco.', 0),
  ('recomendacoes', 'Recomendações', 'Peça e dê indicações de livros.', 1),
  ('clubes-de-leitura', 'Clubes de leitura', 'Leituras em grupo, com calendário e conversa.', 2),
  ('discussoes-de-livros', 'Discussões de livros', 'Um livro por tópico, com ou sem spoilers.', 3),
  ('ajuda', 'Ajuda', 'Dúvidas sobre o MyBooks.', 4);

create table public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories (id),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  contains_spoilers boolean not null default false,
  pinned boolean not null default false,
  locked boolean not null default false,
  hidden_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  reply_count int not null default 0,
  like_count int not null default 0,
  useful_count int not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint forum_topics_title_length check (title = btrim(title) and char_length(title) between 3 and 140),
  constraint forum_topics_body_length check (char_length(btrim(body)) between 1 and 20000),
  constraint forum_topics_tags_valid check (cardinality(tags) <= 5 and private.are_slugs(tags))
);

create index forum_topics_activity_idx on public.forum_topics (last_activity_at desc) where deleted_at is null;
create index forum_topics_category_idx on public.forum_topics (category_id, last_activity_at desc);
create index forum_topics_author_idx on public.forum_topics (author_id, created_at desc);

create table public.forum_topic_books (
  topic_id uuid not null references public.forum_topics (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  primary key (topic_id, book_id)
);

create index forum_topic_books_book_idx on public.forum_topic_books (book_id);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.forum_topics (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Um nível só: a resposta a uma resposta aponta para a de cima
  parent_id uuid references public.forum_replies (id) on delete cascade,
  quoted_reply_id uuid references public.forum_replies (id) on delete set null,
  body text not null,
  like_count int not null default 0,
  useful_count int not null default 0,
  hidden_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint forum_replies_body_length check (char_length(btrim(body)) between 1 and 10000)
);

create index forum_replies_topic_idx on public.forum_replies (topic_id, created_at);
create index forum_replies_author_idx on public.forum_replies (author_id, created_at desc);

create table public.forum_reactions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic_id uuid references public.forum_topics (id) on delete cascade,
  reply_id uuid references public.forum_replies (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  constraint forum_reactions_kind_valid check (kind in ('like', 'useful')),
  constraint forum_reactions_one_target check ((topic_id is null) <> (reply_id is null))
);

create unique index forum_reactions_topic_unique on public.forum_reactions (topic_id, user_id, kind) where topic_id is not null;
create unique index forum_reactions_reply_unique on public.forum_reactions (reply_id, user_id, kind) where reply_id is not null;

create table public.forum_subscriptions (
  topic_id uuid not null references public.forum_topics (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);

create table public.feature_suggestions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  category text not null,
  status text not null default 'nova',
  official_response text,
  responded_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  vote_count int not null default 0,
  comment_count int not null default 0,
  hidden_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint feature_suggestions_title_length check (title = btrim(title) and char_length(title) between 5 and 120),
  constraint feature_suggestions_body_length check (char_length(btrim(body)) between 1 and 5000),
  constraint feature_suggestions_category_valid check (category in ('funcionalidade', 'melhoria', 'bug', 'outro')),
  constraint feature_suggestions_status_valid check (status in ('nova', 'em_analise', 'planejada', 'em_andamento', 'concluida', 'recusada')),
  constraint feature_suggestions_response_length check (char_length(official_response) <= 2000)
);

create index feature_suggestions_votes_idx on public.feature_suggestions (vote_count desc, created_at desc) where deleted_at is null;
create index feature_suggestions_title_trgm_idx on public.feature_suggestions using gin (title extensions.gin_trgm_ops);

create table public.suggestion_votes (
  suggestion_id uuid not null references public.feature_suggestions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);

create table public.suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.feature_suggestions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  hidden_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint suggestion_comments_body_length check (char_length(btrim(body)) between 1 and 3000)
);

create index suggestion_comments_suggestion_idx on public.suggestion_comments (suggestion_id, created_at);

-- Denúncias de qualquer canto da comunidade, numa fila só
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint content_reports_target_valid check (target_type in ('topic', 'reply', 'suggestion', 'suggestion_comment')),
  constraint content_reports_reason_valid check (reason in ('spam', 'ofensivo', 'spoiler', 'fora_do_tema', 'outro')),
  constraint content_reports_details_length check (char_length(details) <= 500),
  constraint content_reports_status_valid check (status in ('pending', 'resolved', 'dismissed'))
);

create unique index content_reports_once on public.content_reports (reporter_id, target_type, target_id) where status = 'pending';
create index content_reports_pending_idx on public.content_reports (created_at) where status = 'pending';

-- O anti-spam: publicações por minuto (menos para contas com menos de um
-- dia) e nada de link nas primeiras publicações de alguém. Conta tópicos,
-- respostas, sugestões e comentários juntos
create or replace function private.community_posts_since(person uuid, since timestamptz)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (select count(*) from public.forum_topics where author_id = person and created_at >= since)
    + (select count(*) from public.forum_replies where author_id = person and created_at >= since)
    + (select count(*) from public.feature_suggestions where author_id = person and created_at >= since)
    + (select count(*) from public.suggestion_comments where author_id = person and created_at >= since)
  )::int;
$$;

-- O anti-spam, antes de cada publicação
create or replace function private.community_anti_spam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  joined timestamptz;
  recent int;
  allowed int;
  previous int;
begin
  select created_at into joined from public.profiles where id = new.author_id;
  recent := private.community_posts_since(new.author_id, now() - interval '1 minute');
  allowed := 4;
  if joined > now() - interval '1 day' then
    allowed := 1;
  end if;
  if recent >= allowed then
    raise exception 'devagar: muitas publicações seguidas' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  if new.body ~* 'https?:[/][/]|www[.]' then
    previous := private.community_posts_since(new.author_id, '-infinity'::timestamptz);
    if previous < 3 then
      raise exception 'links só depois das primeiras publicações' using errcode = 'P0001', hint = 'links';
    end if;
  end if;
  return new;
end;
$$;

create trigger forum_topics_anti_spam before insert on public.forum_topics
  for each row execute function private.community_anti_spam();
create trigger forum_replies_anti_spam before insert on public.forum_replies
  for each row execute function private.community_anti_spam();
create trigger feature_suggestions_anti_spam before insert on public.feature_suggestions
  for each row execute function private.community_anti_spam();
create trigger suggestion_comments_anti_spam before insert on public.suggestion_comments
  for each row execute function private.community_anti_spam();

-- Um nível só de aninhamento, e a resposta pertence ao mesmo tópico
create or replace function private.forum_reply_shape()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent public.forum_replies;
begin
  if new.parent_id is not null then
    select * into parent from public.forum_replies where id = new.parent_id;
    if parent.topic_id is distinct from new.topic_id then
      raise exception 'resposta de outro tópico' using errcode = '22023';
    end if;
    if parent.parent_id is not null then
      new.parent_id := parent.parent_id;
    end if;
  end if;
  if new.quoted_reply_id is not null and not exists (
    select 1 from public.forum_replies where id = new.quoted_reply_id and topic_id = new.topic_id
  ) then
    new.quoted_reply_id := null;
  end if;
  return new;
end;
$$;

create trigger forum_replies_shape before insert on public.forum_replies
  for each row execute function private.forum_reply_shape();

-- @menções: avisa até 10 pessoas citadas (que existem e não são o autor)
create or replace function private.notify_mentions(author uuid, body text, refs jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.notify(p.id, author, 'forum_mention', refs)
  from (
    select distinct lower(m[1]) as username
    from regexp_matches(body, '(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,20})', 'g') as m
    limit 10
  ) as mentioned
  join public.profiles as p on p.username = mentioned.username;
$$;

-- Tópico novo: quem escreveu segue o tópico, e as menções são avisadas
create or replace function private.on_forum_topic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.forum_subscriptions (topic_id, user_id) values (new.id, new.author_id)
  on conflict do nothing;
  perform private.notify_mentions(new.author_id, new.body, jsonb_build_object('topic_id', new.id, 'title', new.title));
  return null;
end;
$$;

create trigger forum_topics_created after insert on public.forum_topics
  for each row execute function private.on_forum_topic();

-- Resposta nova: o tópico ganha atividade e contagem; quem segue o tópico
-- (e o autor da resposta de cima) é avisado, e as menções também
create or replace function private.on_forum_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  topic public.forum_topics;
  refs jsonb;
begin
  if tg_op = 'INSERT' then
    update public.forum_topics
    set reply_count = reply_count + 1, last_activity_at = now()
    where id = new.topic_id
    returning * into topic;
    refs := jsonb_build_object('topic_id', topic.id, 'title', topic.title, 'reply_id', new.id);
    perform private.notify(s.user_id, new.author_id, 'forum_reply', refs)
    from public.forum_subscriptions as s
    where s.topic_id = new.topic_id;
    if new.parent_id is not null then
      perform private.notify(r.author_id, new.author_id, 'forum_reply', refs)
      from public.forum_replies as r
      where r.id = new.parent_id
        and not exists (
          select 1 from public.forum_subscriptions as s
          where s.topic_id = new.topic_id and s.user_id = r.author_id
        );
    end if;
    perform private.notify_mentions(new.author_id, new.body, refs);
    -- Quem responde passa a seguir o tópico
    insert into public.forum_subscriptions (topic_id, user_id) values (new.topic_id, new.author_id)
    on conflict do nothing;
  elsif tg_op = 'UPDATE' and new.deleted_at is not null and old.deleted_at is null then
    update public.forum_topics set reply_count = greatest(reply_count - 1, 0) where id = new.topic_id;
  end if;
  return null;
end;
$$;

create trigger forum_replies_changed after insert or update of deleted_at on public.forum_replies
  for each row execute function private.on_forum_reply();

-- As contagens de reações
create or replace function private.on_forum_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.forum_reactions;
  delta int;
begin
  if tg_op = 'INSERT' then item := new; delta := 1; else item := old; delta := -1; end if;
  if item.topic_id is not null then
    update public.forum_topics set
      like_count = like_count + case when item.kind = 'like' then delta else 0 end,
      useful_count = useful_count + case when item.kind = 'useful' then delta else 0 end
    where id = item.topic_id;
  else
    update public.forum_replies set
      like_count = like_count + case when item.kind = 'like' then delta else 0 end,
      useful_count = useful_count + case when item.kind = 'useful' then delta else 0 end
    where id = item.reply_id;
  end if;
  return null;
end;
$$;

create trigger forum_reactions_count after insert or delete on public.forum_reactions
  for each row execute function private.on_forum_reaction();

create or replace function private.on_suggestion_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.feature_suggestions
  set vote_count = vote_count + case when tg_op = 'INSERT' then 1 else -1 end
  where id = coalesce(new.suggestion_id, old.suggestion_id);
  return null;
end;
$$;

create trigger suggestion_votes_count after insert or delete on public.suggestion_votes
  for each row execute function private.on_suggestion_vote();

create or replace function private.on_suggestion_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.feature_suggestions set comment_count = comment_count + 1 where id = new.suggestion_id;
  elsif new.deleted_at is not null and old.deleted_at is null then
    update public.feature_suggestions set comment_count = greatest(comment_count - 1, 0) where id = new.suggestion_id;
  end if;
  return null;
end;
$$;

create trigger suggestion_comments_count after insert or update of deleted_at on public.suggestion_comments
  for each row execute function private.on_suggestion_comment();

-- Quem sugere vota na própria sugestão
create or replace function private.on_feature_suggestion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.suggestion_votes (suggestion_id, user_id) values (new.id, new.author_id)
  on conflict do nothing;
  return null;
end;
$$;

create trigger feature_suggestions_created after insert on public.feature_suggestions
  for each row execute function private.on_feature_suggestion();

-- RLS. Leitura pública do que não foi excluído nem ocultado (o autor e a
-- equipe veem o oculto); cada um escreve em nome próprio; editar e excluir
-- é do autor (com a marca de editado); fixar, trancar, mover e ocultar só
-- por funções da equipe
alter table public.forum_topics enable row level security;
alter table public.forum_topic_books enable row level security;
alter table public.forum_replies enable row level security;
alter table public.forum_reactions enable row level security;
alter table public.forum_subscriptions enable row level security;
alter table public.feature_suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
alter table public.suggestion_comments enable row level security;
alter table public.content_reports enable row level security;

create policy "topics are public"
  on public.forum_topics for select
  using (
    deleted_at is null
    and (hidden_at is null or author_id = (select auth.uid()) or (select public.is_moderator()))
  );
create policy "people open topics in their own name"
  on public.forum_topics for insert to authenticated
  with check (author_id = (select auth.uid()) and not pinned and not locked and hidden_at is null);
create policy "authors edit their topics"
  on public.forum_topics for update to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()));

create policy "topic books are public" on public.forum_topic_books for select using (true);
create policy "authors link books to their topics"
  on public.forum_topic_books for insert to authenticated
  with check (exists (select 1 from public.forum_topics as t where t.id = topic_id and t.author_id = (select auth.uid())));
create policy "authors unlink books from their topics"
  on public.forum_topic_books for delete to authenticated
  using (exists (select 1 from public.forum_topics as t where t.id = topic_id and t.author_id = (select auth.uid())));

create policy "replies are public"
  on public.forum_replies for select
  using (hidden_at is null or author_id = (select auth.uid()) or (select public.is_moderator()));
create policy "people reply in their own name to open topics"
  on public.forum_replies for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and hidden_at is null
    and exists (
      select 1 from public.forum_topics as t
      where t.id = topic_id and t.deleted_at is null and t.hidden_at is null
        and (not t.locked or (select public.is_moderator()))
    )
  );
create policy "authors edit their replies"
  on public.forum_replies for update to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()));

create policy "reactions are public" on public.forum_reactions for select using (true);
create policy "people react in their own name"
  on public.forum_reactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "people take back their reactions"
  on public.forum_reactions for delete to authenticated using (user_id = (select auth.uid()));

create policy "people see their subscriptions"
  on public.forum_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "people follow topics"
  on public.forum_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "people unfollow topics"
  on public.forum_subscriptions for delete to authenticated using (user_id = (select auth.uid()));

create policy "suggestions are public"
  on public.feature_suggestions for select
  using (
    deleted_at is null
    and (hidden_at is null or author_id = (select auth.uid()) or (select public.is_moderator()))
  );
create policy "people suggest in their own name"
  on public.feature_suggestions for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'nova' and official_response is null and hidden_at is null);
create policy "authors edit their suggestions"
  on public.feature_suggestions for update to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()));

create policy "votes are public" on public.suggestion_votes for select using (true);
create policy "people vote in their own name"
  on public.suggestion_votes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "people take back their votes"
  on public.suggestion_votes for delete to authenticated using (user_id = (select auth.uid()));

create policy "suggestion comments are public"
  on public.suggestion_comments for select
  using (hidden_at is null or author_id = (select auth.uid()) or (select public.is_moderator()));
create policy "people comment in their own name"
  on public.suggestion_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and hidden_at is null);
create policy "authors edit their comments"
  on public.suggestion_comments for update to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()));

create policy "people see their reports and the team sees all"
  on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_moderator()));
create policy "people report in their own name"
  on public.content_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'pending' and reviewed_by is null);

revoke all on table public.forum_topics, public.forum_topic_books, public.forum_replies,
  public.forum_reactions, public.forum_subscriptions, public.feature_suggestions,
  public.suggestion_votes, public.suggestion_comments, public.content_reports
  from anon, authenticated;
grant select on table public.forum_topics, public.forum_topic_books, public.forum_replies,
  public.forum_reactions, public.feature_suggestions, public.suggestion_votes,
  public.suggestion_comments to anon, authenticated;
grant select on table public.forum_subscriptions, public.content_reports to authenticated;
grant insert (category_id, author_id, title, body, tags, contains_spoilers) on table public.forum_topics to authenticated;
grant update (title, body, tags, contains_spoilers, edited_at, deleted_at) on table public.forum_topics to authenticated;
grant insert, delete on table public.forum_topic_books to authenticated;
grant insert (topic_id, author_id, parent_id, quoted_reply_id, body) on table public.forum_replies to authenticated;
grant update (body, edited_at, deleted_at) on table public.forum_replies to authenticated;
grant insert (user_id, topic_id, reply_id, kind), delete on table public.forum_reactions to authenticated;
grant insert, delete on table public.forum_subscriptions to authenticated;
grant insert (author_id, title, body, category) on table public.feature_suggestions to authenticated;
grant update (title, body, category, edited_at, deleted_at) on table public.feature_suggestions to authenticated;
grant insert (suggestion_id, user_id), delete on table public.suggestion_votes to authenticated;
grant insert (suggestion_id, author_id, body) on table public.suggestion_comments to authenticated;
grant update (body, edited_at, deleted_at) on table public.suggestion_comments to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on table public.content_reports to authenticated;

-- Os avisos novos: resposta no tópico que você segue, menção e o status de
-- uma sugestão em que você votou
alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (
  type in (
    'follow', 'follow_request', 'collection_like', 'collection_copy', 'collection_invite',
    'catalog_review', 'forum_reply', 'forum_mention', 'suggestion_status'
  )
);

-- A equipe: fixar, trancar, mover e ocultar (ou mostrar de novo)
create or replace function public.moderate_topic(topic uuid, action text, category uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.forum_topics set
    pinned = case action when 'pin' then true when 'unpin' then false else pinned end,
    locked = case action when 'lock' then true when 'unlock' then false else locked end,
    hidden_at = case action when 'hide' then now() when 'unhide' then null else hidden_at end,
    category_id = case when action = 'move' then coalesce(category, category_id) else category_id end
  where id = topic;
  if not found then
    raise exception 'tópico não encontrado' using errcode = 'P0002';
  end if;
end;
$$;

-- Ocultar o que foi denunciado e resolver as denúncias desse alvo de uma vez
create or replace function public.review_report(report uuid, hide boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.content_reports;
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select * into item from public.content_reports where id = report and status = 'pending';
  if item.id is null then
    raise exception 'denúncia não encontrada' using errcode = 'P0002';
  end if;
  if hide then
    if item.target_type = 'topic' then
      update public.forum_topics set hidden_at = now() where id = item.target_id;
    elsif item.target_type = 'reply' then
      update public.forum_replies set hidden_at = now() where id = item.target_id;
    elsif item.target_type = 'suggestion' then
      update public.feature_suggestions set hidden_at = now() where id = item.target_id;
    else
      update public.suggestion_comments set hidden_at = now() where id = item.target_id;
    end if;
  end if;
  update public.content_reports
  set status = case when hide then 'resolved' else 'dismissed' end,
      reviewed_by = (select auth.uid()), reviewed_at = now()
  where target_type = item.target_type and target_id = item.target_id and status = 'pending';
end;
$$;

-- O status de uma sugestão e a resposta oficial (o admin): quem votou é avisado
create or replace function public.set_suggestion_status(suggestion uuid, new_status text, response text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.feature_suggestions;
begin
  if not public.is_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.feature_suggestions set
    status = new_status,
    official_response = nullif(btrim(response), ''),
    responded_by = case when nullif(btrim(response), '') is null then responded_by else (select auth.uid()) end,
    responded_at = case when nullif(btrim(response), '') is null then responded_at else now() end
  where id = suggestion
  returning * into item;
  if item.id is null then
    raise exception 'sugestão não encontrada' using errcode = 'P0002';
  end if;
  perform private.notify(v.user_id, null, 'suggestion_status',
    jsonb_build_object('suggestion_id', item.id, 'title', item.title, 'status', item.status))
  from public.suggestion_votes as v
  where v.suggestion_id = item.id;
end;
$$;

-- As sugestões com título parecido (pg_trgm), para votar em vez de repetir
create or replace function public.similar_suggestions(q text, max_results int default 5)
returns table (id uuid, title text, status text, vote_count int)
language sql
stable
set search_path = ''
as $$
  select s.id, s.title, s.status, s.vote_count
  from public.feature_suggestions as s
  where char_length(btrim(q)) >= 4
    and s.deleted_at is null and s.hidden_at is null
    and extensions.similarity(lower(s.title), lower(q)) > 0.2
  order by extensions.similarity(lower(s.title), lower(q)) desc
  limit greatest(1, least(coalesce(max_results, 5), 10));
$$;

revoke all on function public.moderate_topic(uuid, text, uuid) from public, anon;
revoke all on function public.review_report(uuid, boolean) from public, anon;
revoke all on function public.set_suggestion_status(uuid, text, text) from public, anon;
grant execute on function public.moderate_topic(uuid, text, uuid) to authenticated;
grant execute on function public.review_report(uuid, boolean) to authenticated;
grant execute on function public.set_suggestion_status(uuid, text, text) to authenticated;
grant execute on function public.similar_suggestions(text, int) to anon, authenticated;
