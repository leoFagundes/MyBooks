-- Leitores para seguir (passo 4 do onboarding): quem divide mais gêneros
-- favoritos com quem está vendo; no empate, quem tem mais seguidores.

create or replace function public.suggested_readers(max_results int default 6)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_private boolean,
  favorite_genres text[],
  common_genres int
)
language sql
stable
set search_path = ''
as $$
  with me as (
    select p.favorite_genres from public.profiles as p where p.id = (select auth.uid())
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.is_private,
    p.favorite_genres,
    cardinality(
      array(select unnest(p.favorite_genres) intersect select unnest(me.favorite_genres))
    )::int as common_genres
  from public.profiles as p, me
  where p.id <> (select auth.uid())
    and p.onboarded_at is not null
    and not exists (
      select 1 from public.follows as f
      where f.follower_id = (select auth.uid()) and f.following_id = p.id
    )
  order by
    common_genres desc,
    (select count(*) from public.follows as f where f.following_id = p.id and f.status = 'accepted') desc,
    p.username
  limit greatest(1, least(coalesce(max_results, 6), 20))
$$;
