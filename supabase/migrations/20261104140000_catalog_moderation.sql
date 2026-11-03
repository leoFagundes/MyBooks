-- Moderação do catálogo (MELHORIAS 7): livros manuais que só entram na busca
-- depois de aprovados, sugestões de edição e de exclusão, exclusão lógica e a
-- mescla de duplicados. Quem revisa é a equipe (is_moderator), sempre por
-- funções daqui, numa transação, que também avisam quem criou ou sugeriu.

alter table public.books
  add column moderation_status text not null default 'approved',
  add column moderation_note text,
  add column deleted_at timestamptz,
  add column merged_into uuid references public.books (id) on delete set null,
  add constraint books_moderation_status_valid check (moderation_status in ('pending', 'approved', 'rejected')),
  add constraint books_merged_not_self check (merged_into <> id);

create index books_moderation_pending_idx on public.books (created_at)
  where moderation_status = 'pending' and deleted_at is null;

-- O livro manual novo espera a revisão; o que já existia fica aprovado (o
-- padrão da coluna). Mudou o que se vê de um aprovado, ele volta à fila
create or replace function private.books_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.source = 'manual' then
      new.moderation_status := 'pending';
    end if;
  elsif new.source = 'manual'
    and (select auth.uid()) = new.created_by
    and (
      new.title is distinct from old.title
      or new.subtitle is distinct from old.subtitle
      or new.authors is distinct from old.authors
      or new.cover_url is distinct from old.cover_url
    ) then
    new.moderation_status := 'pending';
    new.moderation_note := null;
  end if;
  return new;
end;
$$;

create trigger books_moderation
  before insert or update on public.books
  for each row execute function private.books_moderation();

-- Livro excluído some para todo mundo, menos para a equipe
drop policy "catalog is public" on public.books;
create policy "catalog is public"
  on public.books for select
  to anon, authenticated
  using (deleted_at is null or (select public.is_moderator()));

-- A busca pública só acha os aprovados
create or replace function public.search_catalog(q text, max_results int default 8)
returns setof public.books
language sql
stable
set search_path = ''
as $$
  with query as (select private.search_key(q) as key)
  select b.*
  from public.books as b, query
  where char_length(query.key) >= 2
    and b.moderation_status = 'approved'
    and b.deleted_at is null
    and (
      private.book_search_key(b.title, b.authors) like '%' || query.key || '%'
      or query.key operator(extensions.<%) private.book_search_key(b.title, b.authors)
    )
  order by
    extensions.word_similarity(query.key, private.book_search_key(b.title, b.authors)) desc,
    b.title
  limit greatest(1, least(coalesce(max_results, 8), 20))
$$;

-- Para onde foi um livro mesclado (o /livro/<id> antigo redireciona)
create or replace function public.book_redirect(book uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.merged_into from public.books as b
  where b.id = book and b.deleted_at is not null;
$$;

revoke all on function public.book_redirect(uuid) from public;
grant execute on function public.book_redirect(uuid) to anon, authenticated;

-- O aviso da revisão: livro aprovado, rejeitado, mesclado, sugestão aceita
-- ou recusada, gênero aprovado ou recusado (refs.kind diz qual)
alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (
  type in ('follow', 'follow_request', 'collection_like', 'collection_copy', 'collection_invite', 'catalog_review')
);

-- Sugestões de edição, exclusão e mescla
create table public.book_change_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  changes jsonb not null default '{}',
  base_snapshot jsonb not null default '{}',
  reason text not null,
  -- Na mescla, o livro que fica
  target_book_id uuid references public.books (id) on delete cascade,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),

  constraint book_change_requests_type_valid check (type in ('edit', 'delete', 'merge')),
  constraint book_change_requests_status_valid check (status in ('pending', 'approved', 'rejected')),
  constraint book_change_requests_reason_length check (reason = btrim(reason) and char_length(reason) between 3 and 1000),
  constraint book_change_requests_note_length check (char_length(review_note) <= 1000),
  constraint book_change_requests_merge_target check ((type = 'merge') = (target_book_id is not null)),
  constraint book_change_requests_merge_other check (target_book_id <> book_id)
);

create index book_change_requests_pending_idx on public.book_change_requests (created_at)
  where status = 'pending';
create index book_change_requests_user_idx on public.book_change_requests (user_id, status);

alter table public.book_change_requests enable row level security;

-- Até 5 sugestões esperando por pessoa, contra spam
create or replace function private.pending_change_requests(person uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.book_change_requests
  where user_id = person and status = 'pending';
$$;

create policy "people see their suggestions and the team sees all"
  on public.book_change_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_moderator()));

create policy "readers suggest in their own name"
  on public.book_change_requests for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and private.pending_change_requests((select auth.uid())) < 5
  );

revoke all on table public.book_change_requests from anon, authenticated;
grant select on table public.book_change_requests to authenticated;
grant insert (book_id, user_id, type, changes, base_snapshot, reason, target_book_id)
  on table public.book_change_requests to authenticated;

-- Os campos que uma edição pode mudar, aplicados de uma vez (os checks da
-- tabela conferem cada valor)
create or replace function private.apply_book_changes(book uuid, changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.books as b set
    title = case when changes ? 'title' then changes ->> 'title' else b.title end,
    subtitle = case when changes ? 'subtitle' then nullif(changes ->> 'subtitle', '') else b.subtitle end,
    authors = case when changes ? 'authors'
      then array(select jsonb_array_elements_text(changes -> 'authors')) else b.authors end,
    description = case when changes ? 'description' then nullif(changes ->> 'description', '') else b.description end,
    page_count = case when changes ? 'page_count' then (changes ->> 'page_count')::int else b.page_count end,
    published_year = case when changes ? 'published_year' then (changes ->> 'published_year')::int else b.published_year end,
    isbn_13 = case when changes ? 'isbn_13' then nullif(changes ->> 'isbn_13', '') else b.isbn_13 end,
    genres = case when changes ? 'genres'
      then array(select jsonb_array_elements_text(changes -> 'genres')) else b.genres end
  where b.id = book;
end;
$$;

-- A mescla: o duplicado (source) entra no que fica (target). Quem tinha os
-- dois fica com o do alvo, completado com o que só o outro tinha (nota,
-- resenha, datas); itens de coleção, citações e atividades mudam de livro; o
-- duplicado é excluído e aponta para o alvo (a URL antiga redireciona)
create or replace function private.merge_books(source uuid, target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if source = target then
    raise exception 'um livro não se mescla consigo mesmo' using errcode = '22023';
  end if;
  if not exists (select 1 from public.books where id = target and deleted_at is null) then
    raise exception 'o livro que fica não existe' using errcode = '22023';
  end if;

  update public.user_books as t set
    rating = coalesce(t.rating, s.rating),
    review = coalesce(t.review, s.review),
    started_at = coalesce(t.started_at, s.started_at),
    finished_at = coalesce(t.finished_at, s.finished_at),
    current_page = coalesce(t.current_page, s.current_page)
  from public.user_books as s
  where s.book_id = source and t.book_id = target and t.user_id = s.user_id;
  delete from public.user_books as s
  where s.book_id = source
    and exists (
      select 1 from public.user_books as t
      where t.book_id = target and t.user_id = s.user_id
    );
  update public.user_books set book_id = target where book_id = source;

  delete from public.collection_items as s
  where s.book_id = source
    and exists (
      select 1 from public.collection_items as t
      where t.book_id = target and t.collection_id = s.collection_id
    );
  update public.collection_items set book_id = target where book_id = source;

  update public.quotes set book_id = target where book_id = source;
  update public.activities set book_id = target where book_id = source;
  update public.book_change_requests set status = 'rejected', review_note = 'O livro foi mesclado com outro.', reviewed_at = now()
  where book_id = source and status = 'pending';

  update public.books set deleted_at = now(), merged_into = target where id = source;
  -- Mesclas em cadeia apontam direto para o último
  update public.books set merged_into = target where merged_into = source;
end;
$$;

create or replace function private.review_notice(recipient uuid, kind text, book uuid, title text, note text)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.notify(
    recipient,
    null,
    'catalog_review',
    jsonb_strip_nulls(jsonb_build_object('kind', kind, 'book_id', book, 'title', title, 'note', note))
  );
$$;

-- A fila dos livros manuais: aprovar (com ou sem edição), rejeitar com o
-- motivo, ou mesclar com o livro de que ele é duplicado
create or replace function public.review_manual_book(
  book uuid,
  decision text,
  note text default null,
  changes jsonb default null,
  duplicate_of uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.books;
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select * into item from public.books where id = book and source = 'manual' and deleted_at is null;
  if item.id is null then
    raise exception 'livro não encontrado' using errcode = 'P0002';
  end if;

  if decision = 'approve' then
    if changes is not null and changes <> '{}' then
      perform private.apply_book_changes(book, changes);
    end if;
    update public.books set moderation_status = 'approved', moderation_note = null where id = book;
    perform private.review_notice(item.created_by, 'book_approved', book, item.title, null);
  elsif decision = 'reject' then
    if coalesce(btrim(note), '') = '' then
      raise exception 'diga o motivo' using errcode = '22023';
    end if;
    update public.books set moderation_status = 'rejected', moderation_note = btrim(note) where id = book;
    perform private.review_notice(item.created_by, 'book_rejected', book, item.title, btrim(note));
  elsif decision = 'merge' then
    perform private.merge_books(book, duplicate_of);
    perform private.review_notice(item.created_by, 'book_merged', duplicate_of, item.title, note);
  else
    raise exception 'decisão inválida' using errcode = '22023';
  end if;
end;
$$;

-- A fila das sugestões: aprovar aplica a mudança; rejeitar pede a nota
create or replace function public.review_change_request(request uuid, approve boolean, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.book_change_requests;
  title text;
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select * into item from public.book_change_requests where id = request and status = 'pending' for update;
  if item.id is null then
    raise exception 'sugestão não encontrada' using errcode = 'P0002';
  end if;
  select b.title into title from public.books as b where b.id = item.book_id;

  if not approve then
    if coalesce(btrim(note), '') = '' then
      raise exception 'diga o motivo' using errcode = '22023';
    end if;
    update public.book_change_requests
    set status = 'rejected', reviewed_by = (select auth.uid()), reviewed_at = now(), review_note = btrim(note)
    where id = request;
    perform private.review_notice(item.user_id, 'suggestion_rejected', item.book_id, title, btrim(note));
    return;
  end if;

  if item.type = 'edit' then
    perform private.apply_book_changes(item.book_id, item.changes);
  elsif item.type = 'delete' then
    update public.books set deleted_at = now() where id = item.book_id;
  else
    perform private.merge_books(item.book_id, item.target_book_id);
  end if;
  update public.book_change_requests
  set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now(), review_note = nullif(btrim(note), '')
  where id = request;
  perform private.review_notice(
    item.user_id,
    'suggestion_approved',
    case when item.type = 'merge' then item.target_book_id else item.book_id end,
    title,
    nullif(btrim(note), '')
  );
end;
$$;

-- A fila dos gêneros criados por leitores (Fase 5): aprovado, aparece para
-- todos (o espelho dos favoritos acompanha pelo trigger de status)
create or replace function public.review_genre(genre_slug text, approve boolean, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.genres;
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select * into item from public.genres where slug = genre_slug and status = 'pending' for update;
  if item.id is null then
    raise exception 'gênero não encontrado' using errcode = 'P0002';
  end if;
  update public.genres set status = case when approve then 'approved' else 'rejected' end where id = item.id;
  perform private.notify(
    item.created_by,
    null,
    'catalog_review',
    jsonb_strip_nulls(jsonb_build_object(
      'kind', case when approve then 'genre_approved' else 'genre_rejected' end,
      'title', item.name,
      'note', nullif(btrim(note), '')
    ))
  );
end;
$$;

revoke all on function public.review_manual_book(uuid, text, text, jsonb, uuid) from public, anon;
revoke all on function public.review_change_request(uuid, boolean, text) from public, anon;
revoke all on function public.review_genre(text, boolean, text) from public, anon;
grant execute on function public.review_manual_book(uuid, text, text, jsonb, uuid) to authenticated;
grant execute on function public.review_change_request(uuid, boolean, text) to authenticated;
grant execute on function public.review_genre(text, boolean, text) to authenticated;

-- A visão geral do painel conta as três filas
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users', jsonb_build_object(
      'day', (select count(*) from public.profiles where created_at >= now() - interval '1 day'),
      'week', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
      'month', (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
      'total', (select count(*) from public.profiles)
    ),
    'active', jsonb_build_object(
      'week', (
        select count(*) from (
          select actor_id from public.activities where created_at >= now() - interval '7 days'
          union
          select user_id from public.user_books where updated_at >= now() - interval '7 days'
        ) as people
      ),
      'month', (
        select count(*) from (
          select actor_id from public.activities where created_at >= now() - interval '30 days'
          union
          select user_id from public.user_books where updated_at >= now() - interval '30 days'
        ) as people
      )
    ),
    'books', jsonb_build_object(
      'week', (select count(*) from public.books where created_at >= now() - interval '7 days' and deleted_at is null),
      'month', (select count(*) from public.books where created_at >= now() - interval '30 days' and deleted_at is null),
      'total', (select count(*) from public.books where deleted_at is null)
    ),
    'collections', jsonb_build_object(
      'week', (select count(*) from public.collections where created_at >= now() - interval '7 days'),
      'month', (select count(*) from public.collections where created_at >= now() - interval '30 days'),
      'total', (select count(*) from public.collections)
    ),
    'pending', jsonb_build_object(
      'genres', (select count(*) from public.genres where status = 'pending'),
      'books', (select count(*) from public.books where moderation_status = 'pending' and deleted_at is null),
      'requests', (select count(*) from public.book_change_requests where status = 'pending')
    ),
    'growth', (
      select jsonb_agg(jsonb_build_object('week', week, 'users', users) order by week)
      from (
        select
          weeks.week::date as week,
          (
            select count(*) from public.profiles as p
            where p.created_at >= weeks.week and p.created_at < weeks.week + interval '1 week'
          ) as users
        from generate_series(
          date_trunc('week', now()) - interval '11 weeks',
          date_trunc('week', now()),
          interval '1 week'
        ) as weeks (week)
      ) as series
    )
  ) into result;
  return result;
end;
$$;
