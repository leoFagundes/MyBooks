-- Renumera a coleção numa atualização só: depois de um empate de chaves
-- (duas pessoas movendo para a mesma fresta) ou de uma chave que ficou
-- comprida. security invoker: vale a RLS de quem edita, e quem não edita
-- não muda nada (o retorno é quantos livros mudaram).
create or replace function public.set_collection_positions(
  target uuid,
  book_ids uuid[],
  positions text[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed integer;
begin
  if cardinality(book_ids) is distinct from cardinality(positions) then
    raise exception 'Cada livro precisa de uma posição' using errcode = '22023';
  end if;

  update public.collection_items as item
  set position = new_order.position
  from unnest(book_ids, positions) as new_order(book_id, position)
  where item.collection_id = target
    and item.book_id = new_order.book_id;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.set_collection_positions(uuid, uuid[], text[]) from public, anon;
grant execute on function public.set_collection_positions(uuid, uuid[], text[]) to authenticated;
