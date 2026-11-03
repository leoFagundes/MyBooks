-- A mescla tinha um parâmetro chamado source, que é também uma coluna de
-- books: o Postgres não sabia qual dos dois usar. Mesma função, outros nomes
drop function private.merge_books(uuid, uuid);

create function private.merge_books(duplicate uuid, keeper uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if duplicate = keeper then
    raise exception 'um livro não se mescla consigo mesmo' using errcode = '22023';
  end if;
  if not exists (select 1 from public.books as b where b.id = keeper and b.deleted_at is null) then
    raise exception 'o livro que fica não existe' using errcode = '22023';
  end if;

  update public.user_books as t set
    rating = coalesce(t.rating, s.rating),
    review = coalesce(t.review, s.review),
    started_at = coalesce(t.started_at, s.started_at),
    finished_at = coalesce(t.finished_at, s.finished_at),
    current_page = coalesce(t.current_page, s.current_page)
  from public.user_books as s
  where s.book_id = duplicate and t.book_id = keeper and t.user_id = s.user_id;
  delete from public.user_books as s
  where s.book_id = duplicate
    and exists (
      select 1 from public.user_books as t
      where t.book_id = keeper and t.user_id = s.user_id
    );
  update public.user_books set book_id = keeper where book_id = duplicate;

  delete from public.collection_items as s
  where s.book_id = duplicate
    and exists (
      select 1 from public.collection_items as t
      where t.book_id = keeper and t.collection_id = s.collection_id
    );
  update public.collection_items set book_id = keeper where book_id = duplicate;

  update public.quotes set book_id = keeper where book_id = duplicate;
  update public.activities set book_id = keeper where book_id = duplicate;
  update public.book_change_requests
  set status = 'rejected', review_note = 'O livro foi mesclado com outro.', reviewed_at = now()
  where book_id = duplicate and status = 'pending';

  update public.books as b set deleted_at = now(), merged_into = keeper where b.id = duplicate;
  -- Mesclas em cadeia apontam direto para o último
  update public.books as b set merged_into = keeper where b.merged_into = duplicate;
end;
$$;
