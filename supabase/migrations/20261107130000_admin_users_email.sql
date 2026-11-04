-- O e-mail de quem usa o MyBooks só para o admin (LGPD: minimização). O
-- moderador continua achando as pessoas pelo nome e pelo @, mas não vê o
-- e-mail nem busca por ele (a busca revelaria o e-mail aos poucos).

create or replace function public.admin_users(
  q text default null,
  status_filter text default null,
  sort text default 'created_at',
  direction text default 'desc',
  page int default 0,
  page_size int default 20
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz,
  books bigint,
  role text,
  sanction text,
  sanction_ends_at timestamptz,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  term text := nullif(btrim(coalesce(q, '')), '');
  key text := case when sort in ('username', 'books') then sort else 'created_at' end;
  size int := greatest(1, least(coalesce(page_size, 20), 100));
  offset_rows int := greatest(0, coalesce(page, 0)) * greatest(1, least(coalesce(page_size, 20), 100));
  ascending boolean := lower(coalesce(direction, 'desc')) = 'asc';
  sees_email boolean := public.is_admin();
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  return query
  with people as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      case when sees_email then u.email::text end as email,
      p.created_at,
      (select count(*) from public.user_books as ub where ub.user_id = p.id) as books,
      (
        select r.role from public.user_roles as r
        where r.user_id = p.id
        order by case r.role when 'admin' then 0 else 1 end
        limit 1
      ) as role,
      s.kind as sanction,
      s.ends_at as sanction_ends_at
    from public.profiles as p
    left join auth.users as u on u.id = p.id
    left join lateral private.current_sanction(p.id) as s on s.id is not null
    where term is null
      or p.username ilike '%' || term || '%'
      or p.display_name ilike '%' || term || '%'
      or (sees_email and u.email ilike '%' || term || '%')
  ),
  filtered as (
    select * from people
    where case coalesce(status_filter, '')
      when 'suspensos' then people.sanction = 'suspension'
      when 'banidos' then people.sanction = 'ban'
      when 'moderadores' then people.role is not null
      else true
    end
  )
  select f.*, count(*) over () as total
  from filtered as f
  order by
    case when key = 'username' and ascending then f.username end asc,
    case when key = 'username' and not ascending then f.username end desc,
    case when key = 'books' and ascending then f.books end asc,
    case when key = 'books' and not ascending then f.books end desc,
    case when key = 'created_at' and ascending then f.created_at end asc,
    case when key = 'created_at' and not ascending then f.created_at end desc,
    f.id
  limit size offset offset_rows;
end;
$$;
