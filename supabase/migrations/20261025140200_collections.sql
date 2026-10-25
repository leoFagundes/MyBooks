-- Coleções: itens em ordem livre, colaboradores, curtidas e salvos.
-- Os limites espelham COLLECTION_LIMITS (features/collections/schemas.ts).

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  emoji text,
  visibility text not null default 'public',
  is_collaborative boolean not null default false,
  copied_from_id uuid references public.collections (id) on delete set null,
  -- O crédito "Inspirado em @fulano" sobrevive à origem apagada ou privada
  copied_from_owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint collections_title_length check (title = btrim(title) and char_length(title) between 1 and 80),
  constraint collections_description_length check (
    description = btrim(description) and char_length(description) between 1 and 300
  ),
  -- Um emoji só é validado no app (grafemas); aqui, o que claramente não é
  constraint collections_emoji_shape check (
    char_length(emoji) between 1 and 16 and emoji !~ '[[:alnum:][:space:]]'
  ),
  constraint collections_visibility_valid check (visibility in ('public', 'private'))
);

create index collections_owner_id_idx on public.collections (owner_id);
create index collections_copied_from_id_idx on public.collections (copied_from_id);

create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function private.set_updated_at();

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  -- Índice fracionário em base 62: "C" ordena por byte (0-9 < A-Z < a-z)
  position text collate "C" not null,
  note text,
  added_by uuid default auth.uid() references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (collection_id, book_id),
  constraint collection_items_position_format check (position ~ '^[0-9A-Za-z]{2,64}$'),
  constraint collection_items_note_length check (note = btrim(note) and char_length(note) between 1 and 200)
);

create index collection_items_order_idx on public.collection_items (collection_id, position, book_id);
create index collection_items_book_id_idx on public.collection_items (book_id);

create table public.collection_members (
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id),
  constraint collection_members_role_valid check (role in ('editor'))
);

create index collection_members_user_id_idx on public.collection_members (user_id);

create table public.collection_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, collection_id)
);

create index collection_likes_collection_id_idx on public.collection_likes (collection_id);

create table public.collection_saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, collection_id)
);

create index collection_saves_collection_id_idx on public.collection_saves (collection_id);

-- security definer: as políticas de coleções e de membros se consultam, e
-- assim nenhuma cai na RLS da outra
create or replace function private.is_collection_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collection_members as m
    where m.collection_id = target and m.user_id = (select auth.uid())
  )
$$;

create or replace function private.can_view_collection(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collections as c
    where c.id = target
      and (
        c.owner_id = (select auth.uid())
        or (c.visibility = 'public' and private.can_view_content(c.owner_id))
        or private.is_collection_member(c.id)
      )
  )
$$;

-- A dona sempre; membros, enquanto a coleção for colaborativa
create or replace function private.can_edit_collection(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collections as c
    where c.id = target
      and (
        c.owner_id = (select auth.uid())
        or (c.is_collaborative and private.is_collection_member(c.id))
      )
  )
$$;

create or replace function private.is_collection_owner(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.collections as c
    where c.id = target and c.owner_id = (select auth.uid())
  )
$$;

create or replace function private.can_invite_to_collection(target uuid, invitee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collections as c
    where c.id = target
      and c.owner_id = (select auth.uid())
      and c.is_collaborative
      and c.owner_id <> invitee
  )
$$;

-- O crédito vem da coleção de origem, nunca do cliente
create or replace function private.set_copied_from_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.copied_from_owner_id := (
    select c.owner_id from public.collections as c where c.id = new.copied_from_id
  );
  return new;
end;
$$;

create trigger collections_set_copied_from_owner
  before insert on public.collections
  for each row execute function private.set_copied_from_owner();

create or replace function private.limit_collection_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.collection_members as m where m.collection_id = new.collection_id) >= 20 then
    raise exception 'A coleção já tem 20 colaboradores' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger collection_members_limit
  before insert on public.collection_members
  for each row execute function private.limit_collection_members();

-- Coleções: pública de perfil visível para todos; privada, dona e membros.
-- Título, visibilidade e exclusão são da dona
alter table public.collections enable row level security;

create policy "collections follow visibility and profile privacy"
  on public.collections for select
  to anon, authenticated
  using (
    owner_id = (select auth.uid())
    or (visibility = 'public' and private.can_view_content(owner_id))
    or private.is_collection_member(id)
  );

create policy "people create collections in their own name"
  on public.collections for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and (copied_from_id is null or private.can_view_collection(copied_from_id))
  );

create policy "owners edit their collections"
  on public.collections for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "owners delete their collections"
  on public.collections for delete
  to authenticated
  using (owner_id = (select auth.uid()));

revoke all on table public.collections from anon, authenticated;
grant select on table public.collections to anon, authenticated;
grant insert (
  owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id, copied_from_owner_id
) on table public.collections to authenticated;
grant update (title, description, emoji, visibility, is_collaborative) on table public.collections to authenticated;
grant delete on table public.collections to authenticated;

alter table public.collection_items enable row level security;

create policy "items follow their collection"
  on public.collection_items for select
  to anon, authenticated
  using (private.can_view_collection(collection_id));

create policy "editors add items"
  on public.collection_items for insert
  to authenticated
  with check (private.can_edit_collection(collection_id) and added_by = (select auth.uid()));

create policy "editors reorder and annotate items"
  on public.collection_items for update
  to authenticated
  using (private.can_edit_collection(collection_id))
  with check (private.can_edit_collection(collection_id));

create policy "editors remove items"
  on public.collection_items for delete
  to authenticated
  using (private.can_edit_collection(collection_id));

revoke all on table public.collection_items from anon, authenticated;
grant select on table public.collection_items to anon, authenticated;
grant insert (collection_id, book_id, position, note, added_by) on table public.collection_items to authenticated;
grant update (position, note) on table public.collection_items to authenticated;
grant delete on table public.collection_items to authenticated;

-- Membros: a dona convida e remove; o membro pode sair
alter table public.collection_members enable row level security;

create policy "members are visible with the collection"
  on public.collection_members for select
  to anon, authenticated
  using (private.can_view_collection(collection_id));

create policy "owners invite to collaborative collections"
  on public.collection_members for insert
  to authenticated
  with check (private.can_invite_to_collection(collection_id, user_id));

create policy "owners remove members and members leave"
  on public.collection_members for delete
  to authenticated
  using (user_id = (select auth.uid()) or private.is_collection_owner(collection_id));

revoke all on table public.collection_members from anon, authenticated;
grant select on table public.collection_members to anon, authenticated;
grant insert (collection_id, user_id) on table public.collection_members to authenticated;
grant delete on table public.collection_members to authenticated;

-- Curtidas aparecem com a coleção; salvos são de quem salvou
alter table public.collection_likes enable row level security;

create policy "likes are visible with the collection"
  on public.collection_likes for select
  to anon, authenticated
  using (private.can_view_collection(collection_id));

create policy "people like what they can see"
  on public.collection_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()) and private.can_view_collection(collection_id));

create policy "people remove their likes"
  on public.collection_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.collection_likes from anon, authenticated;
grant select on table public.collection_likes to anon, authenticated;
grant insert (user_id, collection_id) on table public.collection_likes to authenticated;
grant delete on table public.collection_likes to authenticated;

alter table public.collection_saves enable row level security;

create policy "saves are private"
  on public.collection_saves for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "people save what they can see"
  on public.collection_saves for insert
  to authenticated
  with check (user_id = (select auth.uid()) and private.can_view_collection(collection_id));

create policy "people remove their saves"
  on public.collection_saves for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.collection_saves from anon, authenticated;
grant select on table public.collection_saves to anon, authenticated;
grant insert (user_id, collection_id) on table public.collection_saves to authenticated;
grant delete on table public.collection_saves to authenticated;
