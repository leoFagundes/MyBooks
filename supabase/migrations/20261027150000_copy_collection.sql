-- Copiar coleção (spec §5.8): uma cópia privada e não colaborativa de quem
-- copia, com os mesmos livros, a mesma ordem e as notas, guardando a origem
-- para o crédito "Inspirado em @fulano" (o trigger preenche a dona). security
-- invoker: só copia o que quem copia vê, pela RLS de coleções e itens. A
-- notificação collection_copy sai pelo trigger da Fase 2.
create or replace function public.copy_collection(source uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  original public.collections%rowtype;
  copy_id uuid;
begin
  select * into original from public.collections where id = source;
  if not found then
    raise exception 'Coleção não encontrada' using errcode = 'P0002';
  end if;

  insert into public.collections (
    owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id
  )
  values (
    (select auth.uid()), original.title, original.description, original.emoji,
    'private', false, original.id
  )
  returning id into copy_id;

  insert into public.collection_items (collection_id, book_id, position, note, added_by)
  select copy_id, item.book_id, item.position, item.note, (select auth.uid())
  from public.collection_items as item
  where item.collection_id = source;

  return copy_id;
end;
$$;

revoke all on function public.copy_collection(uuid) from public, anon;
grant execute on function public.copy_collection(uuid) to authenticated;
