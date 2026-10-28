-- Fase 5 (Social): avisos em tempo real, pedidos aceitos quando o perfil
-- vira público, afinidade literária, feed e o que o Explorar lê.

-- Avisos em tempo real pelo Broadcast: cada aviso novo toca o canal privado
-- de quem o recebe. O payload não leva nada sensível, e o cliente busca a
-- lista de novo. Falha no envio nunca derruba a escrita que gerou o aviso.
create or replace function private.on_notification_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('id', new.id, 'type', new.type),
      'nova',
      'notificacoes:' || new.user_id::text,
      true
    );
  exception when others then
    raise warning 'aviso % sem tempo real: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

create trigger notifications_broadcast
  after insert on public.notifications
  for each row execute function private.on_notification_created();

-- Cada pessoa ouve só o próprio tópico
create policy "people hear their own notifications"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'notificacoes:' || (select auth.uid())::text
  );

-- Perfil que deixa de ser privado aceita quem estava esperando; o trigger de
-- follows transforma cada pedido no aviso de seguidor
create or replace function private.accept_pending_follows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.follows
  set status = 'accepted'
  where following_id = new.id and status = 'pending';
  return null;
end;
$$;

create trigger profiles_accept_pending
  after update of is_private on public.profiles
  for each row
  when (old.is_private and not new.is_private)
  execute function private.accept_pending_follows();

-- Afinidade literária (spec §6): livros em comum pelo coeficiente de Ochiai
-- e gêneros pelo cosseno entre os gostos (cada gênero de um livro da estante
-- vale 1, cada gênero favorito vale 2). A raiz deixa a escala mais próxima
-- de como as pessoas leem uma porcentagem. security invoker: só conta o que
-- quem pergunta pode ver. Sem linha quando um dos lados não tem livro nem
-- gênero favorito.
create or replace function public.reading_affinity(a uuid, b uuid)
returns table (score int, common_books int)
language sql
stable
set search_path = ''
as $$
  with
    shelf_a as (select ub.book_id from public.user_books as ub where ub.user_id = a),
    shelf_b as (select ub.book_id from public.user_books as ub where ub.user_id = b),
    sizes as (
      select
        (select count(*) from shelf_a) as size_a,
        (select count(*) from shelf_b) as size_b,
        (select count(*) from shelf_a join shelf_b using (book_id)) as common
    ),
    taste as (
      select person, genre, sum(weight)::float8 as weight
      from (
        select 'a' as person, unnest(bk.genres) as genre, 1 as weight
        from shelf_a join public.books as bk on bk.id = shelf_a.book_id
        union all
        select 'b', unnest(bk.genres), 1
        from shelf_b join public.books as bk on bk.id = shelf_b.book_id
        union all
        select 'a', unnest(p.favorite_genres), 2 from public.profiles as p where p.id = a
        union all
        select 'b', unnest(p.favorite_genres), 2 from public.profiles as p where p.id = b
      ) as weights
      group by person, genre
    ),
    norms as (
      select
        sqrt(coalesce(sum(t.weight * t.weight) filter (where t.person = 'a'), 0)) as norm_a,
        sqrt(coalesce(sum(t.weight * t.weight) filter (where t.person = 'b'), 0)) as norm_b
      from taste as t
    ),
    overlap as (
      select coalesce(sum(ta.weight * tb.weight), 0) as dot
      from taste as ta
      join taste as tb on tb.genre = ta.genre and tb.person = 'b'
      where ta.person = 'a'
    )
  select
    round(100 * sqrt(
      0.65 * case
        when sizes.size_a > 0 and sizes.size_b > 0
          then sizes.common / sqrt(sizes.size_a::float8 * sizes.size_b)
        else 0
      end
      + 0.35 * case
        when norms.norm_a > 0 and norms.norm_b > 0
          then overlap.dot / (norms.norm_a * norms.norm_b)
        else 0
      end
    ))::int,
    sizes.common::int
  from sizes, norms, overlap
  where (sizes.size_a > 0 or norms.norm_a > 0)
    and (sizes.size_b > 0 or norms.norm_b > 0)
$$;

-- Leitores com afinidade com quem está vendo (Explorar): quem ela ainda não
-- segue, do mais parecido ao menos
create or replace function public.readers_by_affinity(max_results int default 6)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_private boolean,
  favorite_genres text[],
  score int,
  common_books int
)
language sql
stable
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.is_private,
    p.favorite_genres,
    affinity.score,
    affinity.common_books
  from public.profiles as p
  cross join lateral public.reading_affinity((select auth.uid()), p.id) as affinity
  where (select auth.uid()) is not null
    and p.id <> (select auth.uid())
    and p.onboarded_at is not null
    and affinity.score > 0
    and not exists (
      select 1 from public.follows as f
      where f.follower_id = (select auth.uid()) and f.following_id = p.id
    )
  order by affinity.score desc, affinity.common_books desc, p.username
  limit greatest(1, least(coalesce(max_results, 6), 20))
$$;

-- Feed (Início): as atividades de quem a pessoa segue, da mais nova à mais
-- antiga, em páginas pelo cursor (created_at, id). A RLS de activities
-- esconde perfil privado e coleção que não são para quem vê
create or replace function public.feed_activities(
  before_at timestamptz default null,
  before_id uuid default null,
  max_rows int default 60
)
returns setof public.activities
language sql
stable
set search_path = ''
as $$
  select a.*
  from public.activities as a
  where a.actor_id in (
      select f.following_id
      from public.follows as f
      where f.follower_id = (select auth.uid()) and f.status = 'accepted'
    )
    and (
      before_at is null
      or a.created_at < before_at
      or (a.created_at = before_at and a.id < before_id)
    )
  order by a.created_at desc, a.id desc
  limit greatest(1, least(coalesce(max_rows, 60), 100))
$$;

-- Livros em alta (Explorar, spec §6): adições à estante na semana e desde
-- sempre. security_invoker: a estante de perfil privado só conta para quem
-- pode vê-la
create view public.trending_books
with (security_invoker = true)
as
  select
    ub.book_id,
    count(*) filter (where ub.created_at >= now() - interval '7 days') as week_adds,
    count(*) as total_adds
  from public.user_books as ub
  group by ub.book_id;

revoke all on table public.trending_books from anon, authenticated;
grant select on table public.trending_books to anon, authenticated;

-- Coleções populares (Explorar e o Início vazio): as públicas com livros, da
-- mais curtida à menos; no empate, a maior e a mexida há menos tempo
create or replace function public.popular_collections(max_results int default 8)
returns setof public.collections
language sql
stable
set search_path = ''
as $$
  select c.*
  from public.collections as c
  where c.visibility = 'public'
    and exists (select 1 from public.collection_items as i where i.collection_id = c.id)
  order by
    (select count(*) from public.collection_likes as l where l.collection_id = c.id) desc,
    (select count(*) from public.collection_items as i where i.collection_id = c.id) desc,
    c.updated_at desc
  limit greatest(1, least(coalesce(max_results, 8), 24))
$$;

-- Busca de leitores (Explorar): @ e nome, sem acento, com trigramas para o
-- erro de digitação
create index profiles_search_idx on public.profiles
  using gin (
    private.search_key(username || ' ' || coalesce(display_name, '')) extensions.gin_trgm_ops
  );

create or replace function public.search_readers(q text, max_results int default 20)
returns setof public.profiles
language sql
stable
set search_path = ''
as $$
  with query as (select private.search_key(ltrim(q, '@')) as key)
  select p.*
  from public.profiles as p, query
  where char_length(query.key) >= 2
    and p.onboarded_at is not null
    and (
      private.search_key(p.username || ' ' || coalesce(p.display_name, ''))
        like '%' || query.key || '%'
      or query.key operator(extensions.<%)
        private.search_key(p.username || ' ' || coalesce(p.display_name, ''))
    )
  order by
    extensions.word_similarity(
      query.key,
      private.search_key(p.username || ' ' || coalesce(p.display_name, ''))
    ) desc,
    p.username
  limit greatest(1, least(coalesce(max_results, 20), 50))
$$;

-- Busca de coleções (Explorar): full-text em português no título e na
-- descrição, mais trigramas no título. Só as públicas, e a RLS esconde as de
-- perfil privado
create index collections_search_idx on public.collections
  using gin (
    to_tsvector('portuguese', private.search_key(title || ' ' || coalesce(description, '')))
  );

create index collections_title_search_idx on public.collections
  using gin (private.search_key(title) extensions.gin_trgm_ops);

create or replace function public.search_collections(q text, max_results int default 20)
returns setof public.collections
language sql
stable
set search_path = ''
as $$
  with query as (
    select
      private.search_key(q) as key,
      plainto_tsquery('portuguese', private.search_key(q)) as terms
  )
  select c.*
  from public.collections as c, query
  where char_length(query.key) >= 2
    and c.visibility = 'public'
    and (
      to_tsvector('portuguese', private.search_key(c.title || ' ' || coalesce(c.description, '')))
        @@ query.terms
      or query.key operator(extensions.<%) private.search_key(c.title)
    )
  order by
    ts_rank(
      to_tsvector('portuguese', private.search_key(c.title || ' ' || coalesce(c.description, ''))),
      query.terms
    ) desc,
    extensions.word_similarity(query.key, private.search_key(c.title)) desc,
    c.updated_at desc
  limit greatest(1, least(coalesce(max_results, 20), 50))
$$;
