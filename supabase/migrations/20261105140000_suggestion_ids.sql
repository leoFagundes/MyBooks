-- Como no fórum: o cliente escolhe o id da sugestão e abre a página dela sem
-- esperar a volta do insert
grant insert (id) on table public.feature_suggestions to authenticated;
