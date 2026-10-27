-- Contadores do cabeçalho do perfil: livros, coleções, seguidores e
-- seguindo. security definer porque aparecem até em perfil privado, que
-- mostra o cabeçalho a quem não segue. Só contam os pedidos aceitos, e as
-- coleções privadas só para o dono.
create or replace function public.profile_counts(profile_id uuid)
returns table (books bigint, collections bigint, followers bigint, following bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.user_books as ub where ub.user_id = profile_id),
    (
      select count(*)
      from public.collections as c
      where c.owner_id = profile_id
        and (c.visibility = 'public' or c.owner_id = (select auth.uid()))
    ),
    (
      select count(*)
      from public.follows as f
      where f.following_id = profile_id and f.status = 'accepted'
    ),
    (
      select count(*)
      from public.follows as f
      where f.follower_id = profile_id and f.status = 'accepted'
    )
$$;

revoke all on function public.profile_counts(uuid) from public;
grant execute on function public.profile_counts(uuid) to anon, authenticated;
