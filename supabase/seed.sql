-- Gerado por scripts/gerar-seed.mts a partir de scripts/seed-data.ts. Não edite à mão:
-- mude o seed-data.ts e rode npm run seed:gerar. Leitores de exemplo não têm senha.

-- Leitores
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', '8f557e4a-1bd6-500d-956f-20aca9f39731', 'authenticated', 'authenticated',
  'ana@example.com', '', now() - interval '210 days',
  '{"provider":"email","providers":["email"]}', '{"username":"ana","full_name":"Ana Souza"}',
  now() - interval '210 days', now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('8f557e4a-1bd6-500d-956f-20aca9f39731', '8f557e4a-1bd6-500d-956f-20aca9f39731', '{"sub":"8f557e4a-1bd6-500d-956f-20aca9f39731","email":"ana@example.com","email_verified":true}', 'email', now() - interval '210 days', now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = 'Ana Souza',
  bio = 'Machado no ônibus, Clarice antes de dormir.',
  is_private = false,
  onboarded_at = coalesce(onboarded_at, now() - interval '210 days'),
  created_at = now() - interval '210 days'
where id = '8f557e4a-1bd6-500d-956f-20aca9f39731';
-- Os favoritos moram em user_favorite_genres; o array do perfil é espelho
insert into public.user_favorite_genres (user_id, genre_id, position)
select '8f557e4a-1bd6-500d-956f-20aca9f39731', g.id, (s.ord - 1)::smallint
from unnest(array['literatura-brasileira', 'classicos', 'contos']) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
on conflict do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', 'f362edf4-53ed-5763-aca5-367ea784f749', 'authenticated', 'authenticated',
  'bia@example.com', '', now() - interval '200 days',
  '{"provider":"email","providers":["email"]}', '{"username":"bia","full_name":"Bia Lima"}',
  now() - interval '200 days', now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('f362edf4-53ed-5763-aca5-367ea784f749', 'f362edf4-53ed-5763-aca5-367ea784f749', '{"sub":"f362edf4-53ed-5763-aca5-367ea784f749","email":"bia@example.com","email_verified":true}', 'email', now() - interval '200 days', now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = 'Bia Lima',
  bio = 'Fantasia de dia, ficção científica de madrugada.',
  is_private = false,
  onboarded_at = coalesce(onboarded_at, now() - interval '200 days'),
  created_at = now() - interval '200 days'
where id = 'f362edf4-53ed-5763-aca5-367ea784f749';
-- Os favoritos moram em user_favorite_genres; o array do perfil é espelho
insert into public.user_favorite_genres (user_id, genre_id, position)
select 'f362edf4-53ed-5763-aca5-367ea784f749', g.id, (s.ord - 1)::smallint
from unnest(array['fantasia', 'ficcao-cientifica', 'distopia']) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
on conflict do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', '662411c7-eeab-59a4-930c-a1e09cf8ab33', 'authenticated', 'authenticated',
  'caio@example.com', '', now() - interval '240 days',
  '{"provider":"email","providers":["email"]}', '{"username":"caio","full_name":"Caio Andrade"}',
  now() - interval '240 days', now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('662411c7-eeab-59a4-930c-a1e09cf8ab33', '662411c7-eeab-59a4-930c-a1e09cf8ab33', '{"sub":"662411c7-eeab-59a4-930c-a1e09cf8ab33","email":"caio@example.com","email_verified":true}', 'email', now() - interval '240 days', now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = 'Caio Andrade',
  bio = 'Distopias e não ficção. Perfil fechado, mas aceito pedidos.',
  is_private = true,
  onboarded_at = coalesce(onboarded_at, now() - interval '240 days'),
  created_at = now() - interval '240 days'
where id = '662411c7-eeab-59a4-930c-a1e09cf8ab33';
-- Os favoritos moram em user_favorite_genres; o array do perfil é espelho
insert into public.user_favorite_genres (user_id, genre_id, position)
select '662411c7-eeab-59a4-930c-a1e09cf8ab33', g.id, (s.ord - 1)::smallint
from unnest(array['distopia', 'historia', 'ciencia']) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
on conflict do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'authenticated', 'authenticated',
  'duda@example.com', '', now() - interval '180 days',
  '{"provider":"email","providers":["email"]}', '{"username":"duda","full_name":"Duda Rocha"}',
  now() - interval '180 days', now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '{"sub":"b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc","email":"duda@example.com","email_verified":true}', 'email', now() - interval '180 days', now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = 'Duda Rocha',
  bio = 'Romances que doem e clássicos que ensinam.',
  is_private = false,
  onboarded_at = coalesce(onboarded_at, now() - interval '180 days'),
  created_at = now() - interval '180 days'
where id = 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc';
-- Os favoritos moram em user_favorite_genres; o array do perfil é espelho
insert into public.user_favorite_genres (user_id, genre_id, position)
select 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', g.id, (s.ord - 1)::smallint
from unnest(array['romance', 'classicos', 'realismo-magico']) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
on conflict do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'authenticated', 'authenticated',
  'enzo@example.com', '', now() - interval '170 days',
  '{"provider":"email","providers":["email"]}', '{"username":"enzo","full_name":"Enzo Martins"}',
  now() - interval '170 days', now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', '{"sub":"e42289dd-2468-50e1-b1c6-1ed46d5a942c","email":"enzo@example.com","email_verified":true}', 'email', now() - interval '170 days', now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = 'Enzo Martins',
  bio = 'Se tem fantasma, eu leio.',
  is_private = false,
  onboarded_at = coalesce(onboarded_at, now() - interval '170 days'),
  created_at = now() - interval '170 days'
where id = 'e42289dd-2468-50e1-b1c6-1ed46d5a942c';
-- Os favoritos moram em user_favorite_genres; o array do perfil é espelho
insert into public.user_favorite_genres (user_id, genre_id, position)
select 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', g.id, (s.ord - 1)::smallint
from unnest(array['terror', 'misterio', 'classicos']) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
on conflict do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', 'e3c9d64d-7529-5687-ba47-db045c7b638a', 'authenticated', 'authenticated',
  'flor@example.com', '', now() - interval '160 days',
  '{"provider":"email","providers":["email"]}', '{"username":"flor","full_name":"Flor Nunes"}',
  now() - interval '160 days', now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('e3c9d64d-7529-5687-ba47-db045c7b638a', 'e3c9d64d-7529-5687-ba47-db045c7b638a', '{"sub":"e3c9d64d-7529-5687-ba47-db045c7b638a","email":"flor@example.com","email_verified":true}', 'email', now() - interval '160 days', now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = 'Flor Nunes',
  bio = 'Poesia no bolso e um conto por dia.',
  is_private = false,
  onboarded_at = coalesce(onboarded_at, now() - interval '160 days'),
  created_at = now() - interval '160 days'
where id = 'e3c9d64d-7529-5687-ba47-db045c7b638a';
-- Os favoritos moram em user_favorite_genres; o array do perfil é espelho
insert into public.user_favorite_genres (user_id, genre_id, position)
select 'e3c9d64d-7529-5687-ba47-db045c7b638a', g.id, (s.ord - 1)::smallint
from unnest(array['poesia', 'contos', 'literatura-brasileira']) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
on conflict do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'authenticated', 'authenticated',
  'gael@example.com', '', now() - interval '150 days',
  '{"provider":"email","providers":["email"]}', '{"username":"gael","full_name":"Gael Ribeiro"}',
  now() - interval '150 days', now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '{"sub":"f5771a8e-f340-54a6-acb5-31f0efdbd0d2","email":"gael@example.com","email_verified":true}', 'email', now() - interval '150 days', now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = 'Gael Ribeiro',
  bio = 'Quadrinhos, memórias e histórias que aconteceram de verdade.',
  is_private = false,
  onboarded_at = coalesce(onboarded_at, now() - interval '150 days'),
  created_at = now() - interval '150 days'
where id = 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2';
-- Os favoritos moram em user_favorite_genres; o array do perfil é espelho
insert into public.user_favorite_genres (user_id, genre_id, position)
select 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', g.id, (s.ord - 1)::smallint
from unnest(array['quadrinhos', 'biografia', 'historia']) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
on conflict do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'authenticated', 'authenticated',
  'helena@example.com', '', now() - interval '230 days',
  '{"provider":"email","providers":["email"]}', '{"username":"helena","full_name":"Helena Prado"}',
  now() - interval '230 days', now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '{"sub":"b1c25f00-2b61-5bd5-af55-3bf0f55ddadc","email":"helena@example.com","email_verified":true}', 'email', now() - interval '230 days', now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = 'Helena Prado',
  bio = 'Realismo mágico e livros de mais de quinhentas páginas.',
  is_private = false,
  onboarded_at = coalesce(onboarded_at, now() - interval '230 days'),
  created_at = now() - interval '230 days'
where id = 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc';
-- Os favoritos moram em user_favorite_genres; o array do perfil é espelho
insert into public.user_favorite_genres (user_id, genre_id, position)
select 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', g.id, (s.ord - 1)::smallint
from unnest(array['realismo-magico', 'ficcao', 'classicos']) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
on conflict do nothing;

-- Catálogo (dados da Open Library: obra, capa, páginas e ISBN)
insert into public.books (
  id, title, subtitle, authors, description, page_count, published_year, isbn_13,
  language, genres, cover_url, cover_color, source, source_id
) values
('68c7e16e-6b1e-54f7-9662-e4122baaaf7a', 'Dom Casmurro', null, array['Machado de Assis'], 'Bento Santiago, já velho, conta a própria vida para entender um ciúme que nunca o largou: Capitu, a menina dos olhos de ressaca, traiu ou não traiu?', 268, 1899, '9788500507007', 'pt', array['literatura-brasileira', 'classicos', 'romance'], 'https://covers.openlibrary.org/b/id/647501-L.jpg', '#ecc404', 'openlibrary', 'OL1003040W'),
('433c4763-7922-5558-a3ac-1f467fb5b180', 'Memórias Póstumas de Brás Cubas', null, array['Machado de Assis'], 'Um defunto autor narra a própria vida com ironia, sem pressa e sem medo de ofender, num dos romances mais modernos do século XIX.', 242, 1881, '9788594318619', 'pt', array['literatura-brasileira', 'classicos'], 'https://covers.openlibrary.org/b/id/123152-L.jpg', '#958d69', 'openlibrary', 'OL1003017W'),
('293dc899-7436-5443-a7be-7406729e13d6', 'A Hora da Estrela', null, array['Clarice Lispector'], 'Rodrigo S.M. tenta escrever a história de Macabéa, nordestina pobre no Rio de Janeiro, e acaba escrevendo sobre o próprio ato de narrar.', 96, 1977, '9788526502093', 'pt', array['literatura-brasileira', 'ficcao'], 'https://covers.openlibrary.org/b/id/650866-L.jpg', '#82827c', 'openlibrary', 'OL1002120W'),
('369d0a3b-6885-59b8-aba7-8419cd21cd4d', 'A Paixão Segundo G.H.', null, array['Clarice Lispector'], 'Uma escultora entra no quarto da empregada que foi embora e, diante de uma barata, atravessa uma experiência que desmonta o que achava saber sobre si.', 176, 1964, '9788570280084', 'pt', array['literatura-brasileira', 'ficcao', 'filosofia'], null, '#374f6c', 'openlibrary', 'OL1002138W'),
('940261a8-098f-504e-8bda-4bfcf035eaba', 'Torto Arado', null, array['Itamar Vieira Junior'], 'Duas irmãs crescem numa fazenda do sertão baiano, unidas por um acidente na infância e pela luta por terra, memória e voz.', 280, 2019, '9786580309313', 'pt', array['literatura-brasileira', 'ficcao'], 'https://covers.openlibrary.org/b/id/12369648-L.jpg', '#1ab8d0', 'openlibrary', 'OL24141556W'),
('bd726d83-edc2-5381-aa98-1b55c33d6565', 'Grande Sertão: Veredas', null, array['João Guimarães Rosa'], 'Riobaldo, ex-jagunço, conta a um ouvinte silencioso suas andanças pelo sertão, o pacto que talvez tenha feito e o amor por Diadorim.', 504, 1956, '9788520912096', 'pt', array['literatura-brasileira', 'classicos'], 'https://covers.openlibrary.org/b/id/13909068-L.jpg', '#ac7c4c', 'openlibrary', 'OL1756937W'),
('3d4f4713-d94b-593f-b462-10acf3328e40', 'Vidas Secas', null, array['Graciliano Ramos'], 'Fabiano, sinhá Vitória, os dois meninos e a cachorra Baleia fogem da seca pelo sertão, numa prosa seca como a paisagem.', 155, 1938, '9788501085290', 'pt', array['literatura-brasileira', 'classicos'], 'https://covers.openlibrary.org/b/id/12369687-L.jpg', '#b48953', 'openlibrary', 'OL2900596W'),
('869f2f18-2bdf-5fb4-b4ec-00218b41dac2', 'Quarto de Despejo', 'Diário de uma favelada', array['Carolina Maria de Jesus'], 'O diário de Carolina Maria de Jesus na favela do Canindé, em São Paulo: a fome, os filhos, o papel catado na rua e a escrita como resistência.', 200, 1960, '9788508105311', 'pt', array['literatura-brasileira', 'biografia'], 'https://covers.openlibrary.org/b/id/295782-L.jpg', '#b1784d', 'openlibrary', 'OL1810404W'),
('187416ca-3fc3-5a29-81f0-15713f3ea2ed', 'Macunaíma', 'O herói sem nenhum caráter', array['Mário de Andrade'], 'O herói sem nenhum caráter nasce na mata, vai a São Paulo atrás de um amuleto e mistura mitos, línguas e piadas do Brasil inteiro.', 222, 1928, '9788570280077', 'pt', array['literatura-brasileira', 'classicos', 'realismo-magico'], 'https://covers.openlibrary.org/b/id/6921967-L.jpg', '#b45414', 'openlibrary', 'OL1004273W'),
('31fe570b-febd-5747-bdd6-74931aac5e15', 'Capitães da Areia', null, array['Jorge Amado'], 'Um bando de meninos abandonados vive num trapiche de Salvador, entre pequenos furtos, liberdade e a dureza das ruas.', 283, 1937, '9788510053068', 'pt', array['literatura-brasileira', 'ficcao'], 'https://covers.openlibrary.org/b/id/4178919-L.jpg', '#7f7f7f', 'openlibrary', 'OL1248157W'),
('370c7298-7f22-533d-8908-219b490de910', 'O Quinze', null, array['Rachel de Queiroz'], 'A seca de 1915 no Ceará atravessa a vida de Conceição, professora, e da família do vaqueiro Chico Bento, obrigada a migrar.', 139, 1930, null, 'pt', array['literatura-brasileira', 'classicos'], 'https://covers.openlibrary.org/b/id/7901541-L.jpg', '#f4202b', 'openlibrary', 'OL1003585W'),
('10be477c-b383-5b58-8c0d-11ad3b2b79bc', 'Iracema', 'Lenda do Ceará', array['José de Alencar'], 'A lenda da virgem dos lábios de mel e do guerreiro português Martim, que José de Alencar transformou num mito de fundação do Ceará.', 180, 1865, '9788582850336', 'pt', array['literatura-brasileira', 'classicos', 'romance'], 'https://covers.openlibrary.org/b/id/2664651-L.jpg', '#f5d93f', 'openlibrary', 'OL1525650W'),
('11131cd4-0f8a-5536-aad7-3190328d56df', 'O Cortiço', null, array['Aluísio Azevedo'], 'Num cortiço do Rio de Janeiro do século XIX, a ambição de João Romão e a vida coletiva dos moradores mostram o naturalismo em estado bruto.', 254, 1890, '9788593828966', 'pt', array['literatura-brasileira', 'classicos'], 'https://covers.openlibrary.org/b/id/13938346-L.jpg', '#698595', 'openlibrary', 'OL7058886W'),
('471e5b00-339c-56e5-a29f-bf440a50b256', 'O Alquimista', null, array['Paulo Coelho'], 'Santiago, um jovem pastor andaluz, atravessa o deserto atrás de um tesouro e aprende a ouvir os sinais do caminho.', 197, 1988, '9788532503251', 'pt', array['literatura-brasileira', 'ficcao'], 'https://covers.openlibrary.org/b/id/7414780-L.jpg', '#fc5c2c', 'openlibrary', 'OL796465W'),
('f0714c11-2bab-5f35-b265-216ae24f060b', '1984', null, array['George Orwell'], 'Winston Smith trabalha reescrevendo o passado para o Partido e, sob o olhar do Grande Irmão, ousa pensar por conta própria.', 318, 1949, '9786555790627', 'pt', array['distopia', 'ficcao-cientifica', 'classicos'], 'https://covers.openlibrary.org/b/id/9267242-L.jpg', '#91816d', 'openlibrary', 'OL1168083W'),
('9626581c-2816-5dd6-b412-aedeb91ec80c', 'A Revolução dos Bichos', null, array['George Orwell'], 'Os animais de uma granja expulsam o dono e prometem igualdade, até que os porcos começam a mudar as regras.', 128, 1945, '9788525033468', 'pt', array['distopia', 'classicos'], 'https://covers.openlibrary.org/b/id/11261770-L.jpg', '#9c3c24', 'openlibrary', 'OL1168007W'),
('e185294e-3a77-5217-b6d5-c5498a0d2da8', 'Admirável Mundo Novo', null, array['Aldous Huxley'], 'Num futuro de felicidade fabricada, castas planejadas e soma para todos, um selvagem chega para lembrar o que se perdeu.', 241, 1932, '9781537207445', 'pt', array['distopia', 'ficcao-cientifica'], 'https://covers.openlibrary.org/b/id/8231823-L.jpg', '#d2ae13', 'openlibrary', 'OL64365W'),
('99266e47-19f1-58a4-a03d-0521b9cb6477', 'Fahrenheit 451', null, array['Ray Bradbury'], 'Guy Montag é bombeiro num mundo onde os livros são proibidos e o trabalho é queimá-los, até que começa a ler.', 190, 1953, '9788525052247', 'pt', array['distopia', 'ficcao-cientifica'], 'https://covers.openlibrary.org/b/id/12993656-L.jpg', '#e44218', 'openlibrary', 'OL103123W'),
('c3b21852-516c-50df-b298-f8f797006442', 'O Conto da Aia', null, array['Margaret Atwood'], 'Na República de Gilead, Offred é obrigada a gerar filhos para a elite e guarda, em segredo, a memória da vida de antes.', 352, 1985, '9788532520661', 'pt', array['distopia', 'ficcao'], 'https://covers.openlibrary.org/b/id/8231851-L.jpg', '#d1a71c', 'openlibrary', 'OL675783W'),
('ffc913fb-2e10-5be3-bc7c-bded2a3b87d4', 'Duna', null, array['Frank Herbert'], 'Paul Atreides chega a Arrakis, o planeta deserto que guarda a especiaria mais valiosa do universo, e se vê no centro de uma guerra e de uma profecia.', 608, 1965, '9788576571018', 'pt', array['ficcao-cientifica'], 'https://covers.openlibrary.org/b/id/11481354-L.jpg', '#8c843e', 'openlibrary', 'OL893414W'),
('1518282d-f8ff-543e-bab2-325d52729f5c', 'Fundação', null, array['Isaac Asimov'], 'O matemático Hari Seldon prevê a queda do Império Galáctico e cria uma fundação para encurtar a idade das trevas que virá.', 240, 1951, '9788576574835', 'pt', array['ficcao-cientifica'], 'https://covers.openlibrary.org/b/id/14612610-L.jpg', '#8c7116', 'openlibrary', 'OL46125W'),
('994952e1-9aa6-58a1-9cff-3f1ee6802252', 'O Hobbit', null, array['J. R. R. Tolkien'], 'Bilbo Bolseiro, que só queria sossego, parte com treze anões e um mago para recuperar um tesouro guardado por um dragão.', 310, 1937, '9786555110913', 'pt', array['fantasia', 'infantojuvenil'], 'https://covers.openlibrary.org/b/id/14627509-L.jpg', '#7f352a', 'openlibrary', 'OL27482W'),
('93dcc38a-0778-51a3-9303-51052236022b', 'O Senhor dos Anéis', 'A Sociedade do Anel', array['J. R. R. Tolkien'], 'Frodo herda um anel perigoso demais para existir e parte com oito companheiros para destruí-lo, atravessando a Terra-média.', 492, 1954, '9788595084759', 'pt', array['fantasia'], 'https://covers.openlibrary.org/b/id/14627060-L.jpg', '#236394', 'openlibrary', 'OL27513W'),
('e9f5789f-8ee3-540d-934e-496b7a2c3a92', 'Harry Potter e a Pedra Filosofal', null, array['J. K. Rowling'], 'No aniversário de onze anos, Harry descobre que é bruxo e vai estudar em Hogwarts, onde um mistério cerca a pedra filosofal.', 302, 1997, '9786586733501', 'pt', array['fantasia', 'infantojuvenil'], 'https://covers.openlibrary.org/b/id/15155833-L.jpg', '#d04261', 'openlibrary', 'OL82563W'),
('2de73965-3a22-5588-8eba-b271d075e042', 'Cem Anos de Solidão', null, array['Gabriel García Márquez'], 'Sete gerações da família Buendía vivem, amam e se repetem em Macondo, a cidade onde o extraordinário é rotina.', 432, 1967, '9788501110367', 'pt', array['realismo-magico', 'classicos'], 'https://covers.openlibrary.org/b/id/12627383-L.jpg', '#bf3322', 'openlibrary', 'OL274505W'),
('dbc14b0e-3618-517f-98e9-7889440d0a5d', 'A Casa dos Espíritos', null, array['Isabel Allende'], 'A saga da família Trueba ao longo de quatro gerações no Chile, entre amor, política e uma clarividente que conversa com os espíritos.', 453, 1982, '9788528622560', 'pt', array['realismo-magico', 'romance'], 'https://covers.openlibrary.org/b/id/3205226-L.jpg', '#9c682c', 'openlibrary', 'OL1905255W'),
('73ba12f6-33da-5a45-8402-fc3c784df1ab', 'Ensaio sobre a Cegueira', null, array['José Saramago'], 'Uma epidemia de cegueira branca se espalha por uma cidade, e só uma mulher continua vendo o que as pessoas se tornam.', 352, 1995, '9788571644953', 'pt', array['ficcao', 'distopia'], 'https://covers.openlibrary.org/b/id/10482411-L.jpg', '#1ca4d8', 'openlibrary', 'OL27420W'),
('203e3bb1-b148-5954-ae6e-598138ebe34f', 'O Pequeno Príncipe', null, array['Antoine de Saint-Exupéry'], 'Um aviador perdido no deserto conhece um menino vindo de um asteroide, que fala de uma rosa, de uma raposa e do que é essencial.', 96, 1943, '9786589845324', 'pt', array['infantojuvenil', 'classicos', 'filosofia'], 'https://covers.openlibrary.org/b/id/10708272-L.jpg', '#907d28', 'openlibrary', 'OL10263W'),
('4321a6a7-49eb-5067-b380-7767f362b3e0', 'Orgulho e Preconceito', null, array['Jane Austen'], 'Elizabeth Bennet e o orgulhoso senhor Darcy se estranham, se julgam mal e aprendem, devagar, a enxergar um ao outro.', 351, 1813, '9788563560155', 'pt', array['romance', 'classicos'], 'https://covers.openlibrary.org/b/id/14348537-L.jpg', '#d47941', 'openlibrary', 'OL66554W'),
('47ecbdf9-fa3d-5fb0-afe0-62905a6ae75f', 'A Metamorfose', null, array['Franz Kafka'], 'Gregor Samsa acorda transformado num inseto monstruoso e passa a ser um estorvo para a família que sustentava.', 88, 1915, '9786580210008', 'pt', array['classicos', 'ficcao'], 'https://covers.openlibrary.org/b/id/12820198-L.jpg', '#ac7e52', 'openlibrary', 'OL498556W'),
('85178878-5591-5b37-bad1-241d986db64a', 'Crime e Castigo', null, array['Fiódor Dostoiévski'], 'Raskólnikov, estudante pobre de São Petersburgo, mata uma velha agiota convencido de uma teoria e passa a ser consumido pela culpa.', 520, 1866, '9788573262087', 'pt', array['classicos', 'ficcao', 'filosofia'], 'https://covers.openlibrary.org/b/id/9411873-L.jpg', '#940d14', 'openlibrary', 'OL166894W'),
('08d3eb71-1c34-56af-9b5e-062ad2a5e061', 'Dom Quixote', null, array['Miguel de Cervantes'], 'Um fidalgo que leu romances de cavalaria demais sai pela Espanha como cavaleiro andante, ao lado do fiel e prático Sancho Pança.', 519, 1605, '9786584956261', 'pt', array['classicos'], 'https://covers.openlibrary.org/b/id/14428305-L.jpg', '#dc3c3c', 'openlibrary', 'OL503666W'),
('a936cc7c-ba19-5729-91fa-789deddb61bf', 'Frankenstein', 'ou o Prometeu Moderno', array['Mary Shelley'], 'Victor Frankenstein dá vida a uma criatura feita de partes de cadáveres e foge dela, até que a criatura exige uma resposta.', 240, 1818, '9788594540188', 'pt', array['terror', 'ficcao-cientifica', 'classicos'], 'https://covers.openlibrary.org/b/id/12356249-L.jpg', '#a7b747', 'openlibrary', 'OL450063W'),
('e324de8d-a295-5c6c-8cad-02e092b94e97', 'Drácula', null, array['Bram Stoker'], 'Por cartas e diários, um grupo de pessoas descobre que um conde da Transilvânia chegou a Londres e decide caçá-lo.', 384, 1897, '9788537814772', 'pt', array['terror', 'classicos'], 'https://covers.openlibrary.org/b/id/12216503-L.jpg', '#c49c6c', 'openlibrary', 'OL85892W'),
('fed76f20-5ac7-508f-bee5-80596688e8ec', 'O Iluminado', null, array['Stephen King'], 'Jack Torrance aceita cuidar de um hotel isolado durante o inverno, com a mulher e o filho, que tem um dom e percebe o que o lugar esconde.', 506, 1977, '9788581050485', 'pt', array['terror'], 'https://covers.openlibrary.org/b/id/12376585-L.jpg', '#b52213', 'openlibrary', 'OL81633W'),
('861f16c0-8640-5aca-a267-6ea7243b9c76', 'Assassinato no Expresso do Oriente', null, array['Agatha Christie'], 'Um passageiro aparece morto num trem preso pela neve, e Hercule Poirot precisa descobrir quem, entre todos a bordo, é o culpado.', 240, 1934, '9788595086784', 'pt', array['misterio'], 'https://covers.openlibrary.org/b/id/11100465-L.jpg', '#855414', 'openlibrary', 'OL471576W'),
('735fea3f-d3eb-5916-82d9-54cca3eb1010', 'O Nome da Rosa', null, array['Umberto Eco'], 'Num mosteiro italiano do século XIV, o frade Guilherme de Baskerville investiga mortes ligadas a uma biblioteca labiríntica.', 533, 1980, '9788501115829', 'pt', array['misterio', 'historia'], 'https://covers.openlibrary.org/b/id/8598263-L.jpg', '#cd984a', 'openlibrary', 'OL8996439W'),
('616e4d6e-ec2f-509d-806f-094e6e05418c', 'Sapiens', 'Uma breve história da humanidade', array['Yuval Noah Harari'], 'Uma história da humanidade das cavernas ao presente, contada pelas revoluções cognitiva, agrícola e científica.', 456, 2011, '9786559213016', 'pt', array['historia', 'ciencia'], 'https://covers.openlibrary.org/b/id/8634250-L.jpg', '#dc542f', 'openlibrary', 'OL17075811W'),
('7aec7fbb-b9cf-55dd-827b-5a571af3650b', 'O Diário de Anne Frank', null, array['Anne Frank'], 'Escondida com a família num anexo secreto em Amsterdã durante a ocupação nazista, Anne escreve sobre medo, convivência e o desejo de ser escritora.', 285, 1947, '9788594318282', 'pt', array['biografia', 'historia'], 'https://covers.openlibrary.org/b/id/8584021-L.jpg', '#942414', 'openlibrary', 'OL266178W'),
('0cb3cfc9-a024-508a-8187-0a660cdcc6b7', 'Persépolis', null, array['Marjane Satrapi'], 'Em quadrinhos em preto e branco, Marjane Satrapi conta a infância no Irã da revolução islâmica e a adolescência no exílio.', 352, 2000, '9788535911626', 'pt', array['quadrinhos', 'biografia'], 'https://covers.openlibrary.org/b/id/12648921-L.jpg', '#0434d4', 'openlibrary', 'OL5735175W'),
('2218bbc4-b94c-5b21-b9a3-937d3a2a553d', 'Maus', null, array['Art Spiegelman'], 'Art Spiegelman entrevista o pai, sobrevivente de Auschwitz, e transforma a história em quadrinhos com judeus como ratos e nazistas como gatos.', 295, 1986, '9788535906288', 'pt', array['quadrinhos', 'historia', 'biografia'], 'https://covers.openlibrary.org/b/id/10210168-L.jpg', '#95110c', 'openlibrary', 'OL2056818W'),
('0ed43e03-4b54-5155-b8a8-18b6911e7701', 'Mensagem', null, array['Fernando Pessoa'], 'O único livro em português que Fernando Pessoa publicou em vida: poemas que releem a história de Portugal e do mar como mito.', 133, 1934, '9788571648425', 'pt', array['poesia'], 'https://covers.openlibrary.org/b/id/8025492-L.jpg', '#b0b04e', 'openlibrary', 'OL847128W'),
('46a05911-e966-589e-aa1d-862aa7c3bef7', 'Alguma Poesia', null, array['Carlos Drummond de Andrade'], 'A estreia de Drummond, com o Poema de sete faces e a pedra no meio do caminho, marco do modernismo brasileiro.', 270, 1930, '9788586707544', 'pt', array['poesia', 'literatura-brasileira'], 'https://covers.openlibrary.org/b/id/12864352-L.jpg', '#ae9750', 'openlibrary', 'OL1005225W'),
('6a244d0f-c582-575f-bad3-a08786ce8491', 'Uma Breve História do Tempo', null, array['Stephen Hawking'], 'Stephen Hawking explica, para quem não é físico, o Big Bang, os buracos negros e a natureza do tempo.', 241, 1988, '9788580576467', 'pt', array['ciencia'], 'https://covers.openlibrary.org/b/id/10432365-L.jpg', '#8f2424', 'openlibrary', 'OL1892617W')
on conflict do nothing;

-- Estantes
insert into public.user_books (
  user_id, book_id, status, rating, review, started_at, finished_at, current_page,
  copied_from_user_id, created_at, updated_at
) values
('8f557e4a-1bd6-500d-956f-20aca9f39731', '68c7e16e-6b1e-54f7-9662-e4122baaaf7a', 'read', 5, 'Releio a cada cinco anos e a Capitu muda de culpa. Machado sabia o que estava fazendo.', current_date - 133, current_date - 120, null, null, now() - interval '120 days', now() - interval '120 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '433c4763-7922-5558-a3ac-1f467fb5b180', 'read', 4.5, null, current_date - 136, current_date - 110, null, null, now() - interval '110 days', now() - interval '110 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '293dc899-7436-5443-a7be-7406729e13d6', 'read', 5, 'Curto e enorme. A Macabéa fica com a gente por semanas.', current_date - 103, current_date - 95, null, null, now() - interval '95 days', now() - interval '95 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '3d4f4713-d94b-593f-b462-10acf3328e40', 'read', 4, null, current_date - 95, current_date - 80, null, null, now() - interval '80 days', now() - interval '80 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '370c7298-7f22-533d-8908-219b490de910', 'read', 4, null, current_date - 90, current_date - 70, null, null, now() - interval '70 days', now() - interval '70 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '869f2f18-2bdf-5fb4-b4ec-00218b41dac2', 'read', 5, 'Devia ser leitura obrigatória na escola. Dói e ensina.', current_date - 79, current_date - 60, null, null, now() - interval '60 days', now() - interval '60 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '31fe570b-febd-5747-bdd6-74931aac5e15', 'read', 4.5, null, current_date - 59, current_date - 50, null, null, now() - interval '50 days', now() - interval '50 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '187416ca-3fc3-5a29-81f0-15713f3ea2ed', 'abandoned', null, 'Parei na metade. Volto quando estiver com mais paciência.', current_date - 53, null, null, null, now() - interval '40 days', now() - interval '40 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', 'bd726d83-edc2-5381-aa98-1b55c33d6565', 'reading', null, null, current_date - 20, null, 212, null, now() - interval '20 days', now() - interval '20 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '940261a8-098f-504e-8bda-4bfcf035eaba', 'want', null, null, null, null, null, null, now() - interval '10 days', now() - interval '10 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '369d0a3b-6885-59b8-aba7-8419cd21cd4d', 'want', null, null, null, null, null, null, now() - interval '7 days', now() - interval '7 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '10be477c-b383-5b58-8c0d-11ad3b2b79bc', 'want', null, null, null, null, null, null, now() - interval '3 days', now() - interval '3 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', '994952e1-9aa6-58a1-9cff-3f1ee6802252', 'read', 5, 'O livro que me fez gostar de mapas.', current_date - 168, current_date - 150, null, null, now() - interval '150 days', now() - interval '150 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', '93dcc38a-0778-51a3-9303-51052236022b', 'read', 4.5, null, current_date - 157, current_date - 130, null, null, now() - interval '130 days', now() - interval '130 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', 'e9f5789f-8ee3-540d-934e-496b7a2c3a92', 'read', 4, null, current_date - 140, current_date - 125, null, null, now() - interval '125 days', now() - interval '125 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', 'f0714c11-2bab-5f35-b265-216ae24f060b', 'read', 4.5, null, current_date - 117, current_date - 100, null, '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '100 days', now() - interval '100 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', '1518282d-f8ff-543e-bab2-325d52729f5c', 'read', 4, null, current_date - 98, current_date - 90, null, null, now() - interval '90 days', now() - interval '90 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', '73ba12f6-33da-5a45-8402-fc3c784df1ab', 'read', 5, 'Saramago sem ponto final e eu sem fôlego.', current_date - 105, current_date - 85, null, null, now() - interval '85 days', now() - interval '85 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', 'e185294e-3a77-5217-b6d5-c5498a0d2da8', 'read', 3.5, null, current_date - 95, current_date - 75, null, null, now() - interval '75 days', now() - interval '75 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', 'a936cc7c-ba19-5729-91fa-789deddb61bf', 'abandoned', null, null, current_date - 49, null, null, null, now() - interval '30 days', now() - interval '30 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', 'ffc913fb-2e10-5be3-bc7c-bded2a3b87d4', 'reading', null, null, current_date - 15, null, 340, null, now() - interval '15 days', now() - interval '15 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', '99266e47-19f1-58a4-a03d-0521b9cb6477', 'want', null, null, null, null, null, null, now() - interval '12 days', now() - interval '12 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', 'c3b21852-516c-50df-b298-f8f797006442', 'want', null, null, null, null, null, '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '6 days', now() - interval '6 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', 'f0714c11-2bab-5f35-b265-216ae24f060b', 'read', 5, 'Cada ano fica mais atual, e é isso que assusta.', current_date - 217, current_date - 200, null, null, now() - interval '200 days', now() - interval '200 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', 'e185294e-3a77-5217-b6d5-c5498a0d2da8', 'read', 4.5, null, current_date - 210, current_date - 190, null, null, now() - interval '190 days', now() - interval '190 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', '99266e47-19f1-58a4-a03d-0521b9cb6477', 'read', 4, null, current_date - 205, current_date - 185, null, null, now() - interval '185 days', now() - interval '185 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', 'c3b21852-516c-50df-b298-f8f797006442', 'read', 4.5, null, current_date - 182, current_date - 170, null, null, now() - interval '170 days', now() - interval '170 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', '9626581c-2816-5dd6-b412-aedeb91ec80c', 'read', 4, null, current_date - 167, current_date - 160, null, null, now() - interval '160 days', now() - interval '160 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', '73ba12f6-33da-5a45-8402-fc3c784df1ab', 'read', 4.5, null, current_date - 170, current_date - 150, null, null, now() - interval '150 days', now() - interval '150 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', '616e4d6e-ec2f-509d-806f-094e6e05418c', 'read', 4, 'Ótimo para conversar no bar, raso para citar em prova.', current_date - 159, current_date - 140, null, null, now() - interval '140 days', now() - interval '140 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', '6a244d0f-c582-575f-bad3-a08786ce8491', 'reading', null, null, current_date - 25, null, 88, null, now() - interval '25 days', now() - interval '25 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', '735fea3f-d3eb-5916-82d9-54cca3eb1010', 'want', null, null, null, null, null, null, now() - interval '9 days', now() - interval '9 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '4321a6a7-49eb-5067-b380-7767f362b3e0', 'read', 5, 'Elizabeth Bennet é a amiga que eu queria ter.', current_date - 174, current_date - 160, null, null, now() - interval '160 days', now() - interval '160 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '68c7e16e-6b1e-54f7-9662-e4122baaaf7a', 'read', 4, null, current_date - 153, current_date - 140, null, null, now() - interval '140 days', now() - interval '140 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '10be477c-b383-5b58-8c0d-11ad3b2b79bc', 'read', 3.5, null, current_date - 140, current_date - 130, null, null, now() - interval '130 days', now() - interval '130 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '2de73965-3a22-5588-8eba-b271d075e042', 'read', 5, null, current_date - 125, current_date - 110, null, null, now() - interval '110 days', now() - interval '110 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '203e3bb1-b148-5954-ae6e-598138ebe34f', 'read', 4.5, null, current_date - 109, current_date - 100, null, null, now() - interval '100 days', now() - interval '100 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '471e5b00-339c-56e5-a29f-bf440a50b256', 'abandoned', null, 'Não era o momento. Ficou a frase do universo conspirando.', current_date - 114, null, null, null, now() - interval '90 days', now() - interval '90 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'dbc14b0e-3618-517f-98e9-7889440d0a5d', 'reading', null, null, current_date - 18, null, 150, null, now() - interval '18 days', now() - interval '18 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '85178878-5591-5b37-bad1-241d986db64a', 'want', null, null, null, null, null, null, now() - interval '14 days', now() - interval '14 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '31fe570b-febd-5747-bdd6-74931aac5e15', 'want', null, null, null, null, null, null, now() - interval '5 days', now() - interval '5 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'fed76f20-5ac7-508f-bee5-80596688e8ec', 'read', 5, 'Li de luz acesa e mesmo assim olhei o corredor duas vezes.', current_date - 135, current_date - 120, null, null, now() - interval '120 days', now() - interval '120 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'e324de8d-a295-5c6c-8cad-02e092b94e97', 'read', 4.5, null, current_date - 129, current_date - 110, null, null, now() - interval '110 days', now() - interval '110 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'a936cc7c-ba19-5729-91fa-789deddb61bf', 'read', 4.5, null, current_date - 124, current_date - 105, null, null, now() - interval '105 days', now() - interval '105 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', '861f16c0-8640-5aca-a267-6ea7243b9c76', 'read', 4, null, current_date - 106, current_date - 90, null, null, now() - interval '90 days', now() - interval '90 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', '47ecbdf9-fa3d-5fb0-afe0-62905a6ae75f', 'read', 4, null, current_date - 95, current_date - 80, null, null, now() - interval '80 days', now() - interval '80 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', '85178878-5591-5b37-bad1-241d986db64a', 'read', 5, null, current_date - 85, current_date - 70, null, null, now() - interval '70 days', now() - interval '70 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', '735fea3f-d3eb-5916-82d9-54cca3eb1010', 'reading', null, null, current_date - 11, null, 230, null, now() - interval '11 days', now() - interval '11 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'f0714c11-2bab-5f35-b265-216ae24f060b', 'want', null, null, null, null, null, null, now() - interval '8 days', now() - interval '8 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '0ed43e03-4b54-5155-b8a8-18b6911e7701', 'read', 5, 'Pessoa em pílulas: leio um poema por manhã.', current_date - 120, current_date - 100, null, null, now() - interval '100 days', now() - interval '100 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '46a05911-e966-589e-aa1d-862aa7c3bef7', 'read', 4.5, null, current_date - 103, current_date - 95, null, null, now() - interval '95 days', now() - interval '95 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '293dc899-7436-5443-a7be-7406729e13d6', 'read', 4.5, null, current_date - 98, current_date - 90, null, null, now() - interval '90 days', now() - interval '90 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '203e3bb1-b148-5954-ae6e-598138ebe34f', 'read', 5, null, current_date - 94, current_date - 85, null, null, now() - interval '85 days', now() - interval '85 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '3d4f4713-d94b-593f-b462-10acf3328e40', 'read', 4, null, current_date - 90, current_date - 75, null, null, now() - interval '75 days', now() - interval '75 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '940261a8-098f-504e-8bda-4bfcf035eaba', 'read', 5, 'A terra, as mulheres e uma língua cortada. Não esqueço.', current_date - 64, current_date - 40, null, null, now() - interval '40 days', now() - interval '40 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '47ecbdf9-fa3d-5fb0-afe0-62905a6ae75f', 'want', null, null, null, null, null, null, now() - interval '13 days', now() - interval '13 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '369d0a3b-6885-59b8-aba7-8419cd21cd4d', 'reading', null, null, current_date - 9, null, 60, null, now() - interval '9 days', now() - interval '9 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '2218bbc4-b94c-5b21-b9a3-937d3a2a553d', 'read', 5, 'Um quadrinho que vale por uma aula inteira de história.', current_date - 155, current_date - 130, null, null, now() - interval '130 days', now() - interval '130 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '0cb3cfc9-a024-508a-8187-0a660cdcc6b7', 'read', 5, null, current_date - 141, current_date - 120, null, null, now() - interval '120 days', now() - interval '120 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '7aec7fbb-b9cf-55dd-827b-5a571af3650b', 'read', 4.5, null, current_date - 125, current_date - 110, null, null, now() - interval '110 days', now() - interval '110 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '869f2f18-2bdf-5fb4-b4ec-00218b41dac2', 'read', 4.5, null, current_date - 119, current_date - 100, null, null, now() - interval '100 days', now() - interval '100 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '994952e1-9aa6-58a1-9cff-3f1ee6802252', 'read', 4, null, current_date - 78, current_date - 60, null, null, now() - interval '60 days', now() - interval '60 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '08d3eb71-1c34-56af-9b5e-062ad2a5e061', 'abandoned', null, 'Bonito, mas pesado demais para ler no ônibus.', current_date - 58, null, null, null, now() - interval '45 days', now() - interval '45 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '616e4d6e-ec2f-509d-806f-094e6e05418c', 'reading', null, null, current_date - 16, null, 190, null, now() - interval '16 days', now() - interval '16 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '6a244d0f-c582-575f-bad3-a08786ce8491', 'want', null, null, null, null, null, null, now() - interval '7 days', now() - interval '7 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '2de73965-3a22-5588-8eba-b271d075e042', 'read', 5, 'Precisei desenhar a árvore genealógica no caderno. Valeu cada página.', current_date - 195, current_date - 180, null, null, now() - interval '180 days', now() - interval '180 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'dbc14b0e-3618-517f-98e9-7889440d0a5d', 'read', 4.5, null, current_date - 180, current_date - 160, null, null, now() - interval '160 days', now() - interval '160 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '187416ca-3fc3-5a29-81f0-15713f3ea2ed', 'read', 4, null, current_date - 163, current_date - 150, null, null, now() - interval '150 days', now() - interval '150 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'bd726d83-edc2-5381-aa98-1b55c33d6565', 'read', 5, 'Nonada. Começa com essa palavra e não acaba nunca.', current_date - 152, current_date - 140, null, null, now() - interval '140 days', now() - interval '140 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '11131cd4-0f8a-5536-aad7-3190328d56df', 'read', 3.5, null, current_date - 139, current_date - 120, null, null, now() - interval '120 days', now() - interval '120 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '85178878-5591-5b37-bad1-241d986db64a', 'read', 4.5, null, current_date - 115, current_date - 100, null, null, now() - interval '100 days', now() - interval '100 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '940261a8-098f-504e-8bda-4bfcf035eaba', 'read', 5, null, current_date - 94, current_date - 70, null, null, now() - interval '70 days', now() - interval '70 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '08d3eb71-1c34-56af-9b5e-062ad2a5e061', 'reading', null, null, current_date - 30, null, 520, null, now() - interval '30 days', now() - interval '30 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'ffc913fb-2e10-5be3-bc7c-bded2a3b87d4', 'want', null, null, null, null, null, null, now() - interval '4 days', now() - interval '4 days')
on conflict (user_id, book_id) do nothing;

-- Citações
insert into public.quotes (id, user_id, book_id, text, created_at) values
('edc768e2-a255-566d-9d45-2bf9a04254ac', '8f557e4a-1bd6-500d-956f-20aca9f39731', '68c7e16e-6b1e-54f7-9662-e4122baaaf7a', 'Olhos de cigana oblíqua e dissimulada.', now() - interval '121 days'),
('c5d7c71d-f4be-5cc3-935d-796c053f7d52', '8f557e4a-1bd6-500d-956f-20aca9f39731', '433c4763-7922-5558-a3ac-1f467fb5b180', 'Não tive filhos, não transmiti a nenhuma criatura o legado da nossa miséria.', now() - interval '111 days'),
('f5221da1-6e78-5d04-a469-357e567f34eb', '8f557e4a-1bd6-500d-956f-20aca9f39731', '293dc899-7436-5443-a7be-7406729e13d6', 'Tudo no mundo começou com um sim.', now() - interval '96 days'),
('88d5a80e-01aa-5880-bdb5-6275c5cd8c09', '8f557e4a-1bd6-500d-956f-20aca9f39731', '3d4f4713-d94b-593f-b462-10acf3328e40', 'Você é um bicho, Fabiano.', now() - interval '81 days'),
('09ebcd00-eb65-59dc-9014-e368d59a94c7', '8f557e4a-1bd6-500d-956f-20aca9f39731', 'bd726d83-edc2-5381-aa98-1b55c33d6565', 'O real não está na saída nem na chegada: ele se dispõe para a gente é no meio da travessia.', now() - interval '19 days'),
('18811032-444f-5737-be90-86f37d1c5e4e', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'bd726d83-edc2-5381-aa98-1b55c33d6565', 'Viver é muito perigoso.', now() - interval '141 days'),
('d241d854-514e-591e-abd7-8c4064b8dbce', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '2de73965-3a22-5588-8eba-b271d075e042', 'Muitos anos depois, diante do pelotão de fuzilamento, o coronel Aureliano Buendía havia de recordar aquela tarde remota em que seu pai o levou para conhecer o gelo.', now() - interval '181 days'),
('d7c82e89-6532-5841-a30c-a6916ab86248', '662411c7-eeab-59a4-930c-a1e09cf8ab33', 'f0714c11-2bab-5f35-b265-216ae24f060b', 'Guerra é paz. Liberdade é escravidão. Ignorância é força.', now() - interval '201 days'),
('bd75bb83-4cc9-5edc-93d9-d89834078b2f', '662411c7-eeab-59a4-930c-a1e09cf8ab33', '9626581c-2816-5dd6-b412-aedeb91ec80c', 'Todos os animais são iguais, mas alguns animais são mais iguais do que outros.', now() - interval '161 days'),
('09a660f0-c82a-58b4-9da2-4cf94ad267dc', 'f362edf4-53ed-5763-aca5-367ea784f749', '994952e1-9aa6-58a1-9cff-3f1ee6802252', 'Numa toca no chão vivia um hobbit.', now() - interval '151 days'),
('ab018b99-cd3b-5c25-81c9-affb01c9bbb7', 'f362edf4-53ed-5763-aca5-367ea784f749', 'ffc913fb-2e10-5be3-bc7c-bded2a3b87d4', 'O medo é o assassino da mente.', now() - interval '14 days'),
('119220a3-4f95-519f-a1be-6766468914e2', 'f362edf4-53ed-5763-aca5-367ea784f749', '73ba12f6-33da-5a45-8402-fc3c784df1ab', 'Se podes olhar, vê. Se podes ver, repara.', now() - interval '86 days'),
('b8f04ac2-446d-547c-92f8-c1d3fe20e79e', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '4321a6a7-49eb-5067-b380-7767f362b3e0', 'É uma verdade universalmente reconhecida que um homem solteiro, possuidor de uma boa fortuna, deve estar necessitado de uma esposa.', now() - interval '161 days'),
('2ccd3eed-1f47-596c-ad47-2b66402df35b', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '203e3bb1-b148-5954-ae6e-598138ebe34f', 'Tu te tornas eternamente responsável por aquilo que cativas.', now() - interval '101 days'),
('4e95d498-f417-536e-a00f-7e2b8cb1213c', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '10be477c-b383-5b58-8c0d-11ad3b2b79bc', 'Verdes mares bravios de minha terra natal, onde canta a jandaia nas frondes da carnaúba.', now() - interval '131 days'),
('62d3e800-7b47-538c-a6c7-a9fdc06cee6a', 'e3c9d64d-7529-5687-ba47-db045c7b638a', '203e3bb1-b148-5954-ae6e-598138ebe34f', 'Só se vê bem com o coração. O essencial é invisível aos olhos.', now() - interval '86 days'),
('8502b286-3cec-5c8e-95d2-66142774f373', 'e3c9d64d-7529-5687-ba47-db045c7b638a', '0ed43e03-4b54-5155-b8a8-18b6911e7701', 'Tudo vale a pena se a alma não é pequena.', now() - interval '101 days'),
('8fecb564-4513-5cbb-809b-5223f1623d3e', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', '47ecbdf9-fa3d-5fb0-afe0-62905a6ae75f', 'Quando certa manhã Gregor Samsa acordou de sonhos intranquilos, encontrou-se em sua cama metamorfoseado num inseto monstruoso.', now() - interval '81 days'),
('7e865ef8-425a-5149-bee9-a83684f10fc1', 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '08d3eb71-1c34-56af-9b5e-062ad2a5e061', 'Num lugar da Mancha, de cujo nome não quero lembrar-me.', now() - interval '46 days')
on conflict (id) do nothing;

-- Quem segue quem
insert into public.follows (follower_id, following_id, created_at) values
('8f557e4a-1bd6-500d-956f-20aca9f39731', 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '190 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', now() - interval '170 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', 'e3c9d64d-7529-5687-ba47-db045c7b638a', now() - interval '150 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '188 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '180 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', now() - interval '140 days'),
('f362edf4-53ed-5763-aca5-367ea784f749', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', now() - interval '120 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '179 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '175 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '165 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', now() - interval '160 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', now() - interval '100 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', now() - interval '99 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '95 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '155 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', now() - interval '130 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', now() - interval '125 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '145 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', now() - interval '90 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '2 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', now() - interval '158 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '150 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'e3c9d64d-7529-5687-ba47-db045c7b638a', now() - interval '120 days')
on conflict do nothing;

update public.follows set status = 'accepted'
where follower_id = '8f557e4a-1bd6-500d-956f-20aca9f39731' and following_id = 'f362edf4-53ed-5763-aca5-367ea784f749' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = '8f557e4a-1bd6-500d-956f-20aca9f39731' and following_id = 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = '8f557e4a-1bd6-500d-956f-20aca9f39731' and following_id = 'e3c9d64d-7529-5687-ba47-db045c7b638a' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'f362edf4-53ed-5763-aca5-367ea784f749' and following_id = '8f557e4a-1bd6-500d-956f-20aca9f39731' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'f362edf4-53ed-5763-aca5-367ea784f749' and following_id = '662411c7-eeab-59a4-930c-a1e09cf8ab33' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'f362edf4-53ed-5763-aca5-367ea784f749' and following_id = 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'f362edf4-53ed-5763-aca5-367ea784f749' and following_id = 'e42289dd-2468-50e1-b1c6-1ed46d5a942c' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = '662411c7-eeab-59a4-930c-a1e09cf8ab33' and following_id = 'f362edf4-53ed-5763-aca5-367ea784f749' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = '662411c7-eeab-59a4-930c-a1e09cf8ab33' and following_id = '8f557e4a-1bd6-500d-956f-20aca9f39731' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc' and following_id = '8f557e4a-1bd6-500d-956f-20aca9f39731' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc' and following_id = 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc' and following_id = 'e42289dd-2468-50e1-b1c6-1ed46d5a942c' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'e42289dd-2468-50e1-b1c6-1ed46d5a942c' and following_id = 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'e42289dd-2468-50e1-b1c6-1ed46d5a942c' and following_id = 'f362edf4-53ed-5763-aca5-367ea784f749' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'e3c9d64d-7529-5687-ba47-db045c7b638a' and following_id = '8f557e4a-1bd6-500d-956f-20aca9f39731' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'e3c9d64d-7529-5687-ba47-db045c7b638a' and following_id = 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'e3c9d64d-7529-5687-ba47-db045c7b638a' and following_id = 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2' and following_id = 'f362edf4-53ed-5763-aca5-367ea784f749' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2' and following_id = 'e42289dd-2468-50e1-b1c6-1ed46d5a942c' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc' and following_id = 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc' and following_id = '8f557e4a-1bd6-500d-956f-20aca9f39731' and status = 'pending';
update public.follows set status = 'accepted'
where follower_id = 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc' and following_id = 'e3c9d64d-7529-5687-ba47-db045c7b638a' and status = 'pending';

-- Coleções
insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '8f557e4a-1bd6-500d-956f-20aca9f39731', 'Clássicos brasileiros', 'Os livros que explicam o Brasil, de Machado a Carolina Maria de Jesus.',
  '📚', 'public', true,
  null,
  now() - interval '115 days', now() - interval '115 days'
) on conflict (id) do nothing;
insert into public.collection_members (collection_id, user_id, created_at) values
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '115 days')
on conflict do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '68c7e16e-6b1e-54f7-9662-e4122baaaf7a', 'a0', 'Capitu traiu ou não traiu? Cada releitura muda a resposta.', '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '115 days'),
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '433c4763-7922-5558-a3ac-1f467fb5b180', 'a1', null, '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '114 days'),
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', 'bd726d83-edc2-5381-aa98-1b55c33d6565', 'a2', 'Para ler em voz alta, devagar.', '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '113 days'),
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '3d4f4713-d94b-593f-b462-10acf3328e40', 'a3', null, '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '112 days'),
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '293dc899-7436-5443-a7be-7406729e13d6', 'a4', null, '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '111 days'),
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '869f2f18-2bdf-5fb4-b4ec-00218b41dac2', 'a5', 'O diário que todo mundo devia ler na escola.', '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '110 days'),
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '940261a8-098f-504e-8bda-4bfcf035eaba', 'a6', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '109 days'),
('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '369d0a3b-6885-59b8-aba7-8419cd21cd4d', 'a7', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '108 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('f362edf4-53ed-5763-aca5-367ea784f749', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '112 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '109 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '106 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '103 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '100 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '97 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '94 days')
on conflict do nothing;
insert into public.collection_saves (user_id, collection_id, created_at) values
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '111 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', 'e24a4efa-193a-5b79-bc92-6bf71f7bdca7', now() - interval '107 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  '934fa723-20d1-53d8-acc8-0c2e171c50a4', '8f557e4a-1bd6-500d-956f-20aca9f39731', 'Para ler devagar', null,
  '🍵', 'private', false,
  null,
  now() - interval '30 days', now() - interval '30 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('934fa723-20d1-53d8-acc8-0c2e171c50a4', 'bd726d83-edc2-5381-aa98-1b55c33d6565', 'a0', null, '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '30 days'),
('934fa723-20d1-53d8-acc8-0c2e171c50a4', '369d0a3b-6885-59b8-aba7-8419cd21cd4d', 'a1', null, '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '29 days'),
('934fa723-20d1-53d8-acc8-0c2e171c50a4', '10be477c-b383-5b58-8c0d-11ad3b2b79bc', 'a2', null, '8f557e4a-1bd6-500d-956f-20aca9f39731', now() - interval '28 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  'c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', '662411c7-eeab-59a4-930c-a1e09cf8ab33', 'Distopias', 'Os futuros que a gente tenta evitar.',
  '🔦', 'public', false,
  null,
  now() - interval '165 days', now() - interval '165 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', 'f0714c11-2bab-5f35-b265-216ae24f060b', 'a0', 'O primeiro, e ainda o mais assustador.', '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '165 days'),
('c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', 'e185294e-3a77-5217-b6d5-c5498a0d2da8', 'a1', null, '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '164 days'),
('c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', '99266e47-19f1-58a4-a03d-0521b9cb6477', 'a2', null, '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '163 days'),
('c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', 'c3b21852-516c-50df-b298-f8f797006442', 'a3', null, '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '162 days'),
('c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', '73ba12f6-33da-5a45-8402-fc3c784df1ab', 'a4', null, '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '161 days'),
('c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', '9626581c-2816-5dd6-b412-aedeb91ec80c', 'a5', null, '662411c7-eeab-59a4-930c-a1e09cf8ab33', now() - interval '160 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('f362edf4-53ed-5763-aca5-367ea784f749', 'c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', now() - interval '162 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  '6553e79f-d2b5-54a0-81c0-9ab344c337d4', 'f362edf4-53ed-5763-aca5-367ea784f749', 'Fantasia para começar', 'Portas de entrada para mundos inteiros.',
  '🐉', 'public', false,
  null,
  now() - interval '120 days', now() - interval '120 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('6553e79f-d2b5-54a0-81c0-9ab344c337d4', '994952e1-9aa6-58a1-9cff-3f1ee6802252', 'a0', 'Comece por aqui. Sério.', 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '120 days'),
('6553e79f-d2b5-54a0-81c0-9ab344c337d4', '93dcc38a-0778-51a3-9303-51052236022b', 'a1', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '119 days'),
('6553e79f-d2b5-54a0-81c0-9ab344c337d4', 'e9f5789f-8ee3-540d-934e-496b7a2c3a92', 'a2', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '118 days'),
('6553e79f-d2b5-54a0-81c0-9ab344c337d4', 'ffc913fb-2e10-5be3-bc7c-bded2a3b87d4', 'a3', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '117 days'),
('6553e79f-d2b5-54a0-81c0-9ab344c337d4', '1518282d-f8ff-543e-bab2-325d52729f5c', 'a4', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '116 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '6553e79f-d2b5-54a0-81c0-9ab344c337d4', now() - interval '117 days'),
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', '6553e79f-d2b5-54a0-81c0-9ab344c337d4', now() - interval '114 days'),
('8f557e4a-1bd6-500d-956f-20aca9f39731', '6553e79f-d2b5-54a0-81c0-9ab344c337d4', now() - interval '111 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  'f45efa6b-d823-5510-829d-7589d466c0bc', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'Para ler de luz acesa', 'Clássicos do medo e alguns mistérios.',
  '🕯️', 'public', false,
  null,
  now() - interval '88 days', now() - interval '88 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('f45efa6b-d823-5510-829d-7589d466c0bc', 'fed76f20-5ac7-508f-bee5-80596688e8ec', 'a0', null, 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', now() - interval '88 days'),
('f45efa6b-d823-5510-829d-7589d466c0bc', 'e324de8d-a295-5c6c-8cad-02e092b94e97', 'a1', null, 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', now() - interval '87 days'),
('f45efa6b-d823-5510-829d-7589d466c0bc', 'a936cc7c-ba19-5729-91fa-789deddb61bf', 'a2', null, 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', now() - interval '86 days'),
('f45efa6b-d823-5510-829d-7589d466c0bc', '861f16c0-8640-5aca-a267-6ea7243b9c76', 'a3', null, 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', now() - interval '85 days'),
('f45efa6b-d823-5510-829d-7589d466c0bc', '735fea3f-d3eb-5916-82d9-54cca3eb1010', 'a4', null, 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', now() - interval '84 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('f362edf4-53ed-5763-aca5-367ea784f749', 'f45efa6b-d823-5510-829d-7589d466c0bc', now() - interval '85 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'f45efa6b-d823-5510-829d-7589d466c0bc', now() - interval '82 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  '93a74b60-7ea9-5fc2-aace-1b162048ed5f', 'e3c9d64d-7529-5687-ba47-db045c7b638a', 'Curtos e certeiros', 'Menos de duzentas páginas que ficam anos na cabeça.',
  '✂️', 'public', false,
  null,
  now() - interval '70 days', now() - interval '70 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('93a74b60-7ea9-5fc2-aace-1b162048ed5f', '293dc899-7436-5443-a7be-7406729e13d6', 'a0', null, 'e3c9d64d-7529-5687-ba47-db045c7b638a', now() - interval '70 days'),
('93a74b60-7ea9-5fc2-aace-1b162048ed5f', '203e3bb1-b148-5954-ae6e-598138ebe34f', 'a1', null, 'e3c9d64d-7529-5687-ba47-db045c7b638a', now() - interval '69 days'),
('93a74b60-7ea9-5fc2-aace-1b162048ed5f', '47ecbdf9-fa3d-5fb0-afe0-62905a6ae75f', 'a2', null, 'e3c9d64d-7529-5687-ba47-db045c7b638a', now() - interval '68 days'),
('93a74b60-7ea9-5fc2-aace-1b162048ed5f', '3d4f4713-d94b-593f-b462-10acf3328e40', 'a3', null, 'e3c9d64d-7529-5687-ba47-db045c7b638a', now() - interval '67 days'),
('93a74b60-7ea9-5fc2-aace-1b162048ed5f', '370c7298-7f22-533d-8908-219b490de910', 'a4', null, 'e3c9d64d-7529-5687-ba47-db045c7b638a', now() - interval '66 days'),
('93a74b60-7ea9-5fc2-aace-1b162048ed5f', '0ed43e03-4b54-5155-b8a8-18b6911e7701', 'a5', null, 'e3c9d64d-7529-5687-ba47-db045c7b638a', now() - interval '65 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('8f557e4a-1bd6-500d-956f-20aca9f39731', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', now() - interval '67 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', now() - interval '64 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', now() - interval '61 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', now() - interval '58 days')
on conflict do nothing;
insert into public.collection_saves (user_id, collection_id, created_at) values
('8f557e4a-1bd6-500d-956f-20aca9f39731', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', now() - interval '66 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  'de846290-c356-566a-a9e2-15bcc9cfa478', 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'Histórias que aconteceram', 'Memórias, diários e quadrinhos que não são ficção.',
  '🗞️', 'public', false,
  null,
  now() - interval '95 days', now() - interval '95 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('de846290-c356-566a-a9e2-15bcc9cfa478', '2218bbc4-b94c-5b21-b9a3-937d3a2a553d', 'a0', null, 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', now() - interval '95 days'),
('de846290-c356-566a-a9e2-15bcc9cfa478', '0cb3cfc9-a024-508a-8187-0a660cdcc6b7', 'a1', null, 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', now() - interval '94 days'),
('de846290-c356-566a-a9e2-15bcc9cfa478', '7aec7fbb-b9cf-55dd-827b-5a571af3650b', 'a2', null, 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', now() - interval '93 days'),
('de846290-c356-566a-a9e2-15bcc9cfa478', '869f2f18-2bdf-5fb4-b4ec-00218b41dac2', 'a3', null, 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', now() - interval '92 days'),
('de846290-c356-566a-a9e2-15bcc9cfa478', '616e4d6e-ec2f-509d-806f-094e6e05418c', 'a4', null, 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', now() - interval '91 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('8f557e4a-1bd6-500d-956f-20aca9f39731', 'de846290-c356-566a-a9e2-15bcc9cfa478', now() - interval '92 days'),
('662411c7-eeab-59a4-930c-a1e09cf8ab33', 'de846290-c356-566a-a9e2-15bcc9cfa478', now() - interval '89 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', 'de846290-c356-566a-a9e2-15bcc9cfa478', now() - interval '86 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  'b2023aae-8514-50e4-9b38-8d72d7a2ebfe', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'Realismo mágico', 'Quando o impossível é só mais um dia comum.',
  '✨', 'public', false,
  null,
  now() - interval '135 days', now() - interval '135 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('b2023aae-8514-50e4-9b38-8d72d7a2ebfe', '2de73965-3a22-5588-8eba-b271d075e042', 'a0', null, 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', now() - interval '135 days'),
('b2023aae-8514-50e4-9b38-8d72d7a2ebfe', 'dbc14b0e-3618-517f-98e9-7889440d0a5d', 'a1', null, 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', now() - interval '134 days'),
('b2023aae-8514-50e4-9b38-8d72d7a2ebfe', '187416ca-3fc3-5a29-81f0-15713f3ea2ed', 'a2', null, 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', now() - interval '133 days'),
('b2023aae-8514-50e4-9b38-8d72d7a2ebfe', '940261a8-098f-504e-8bda-4bfcf035eaba', 'a3', null, 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', now() - interval '132 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'b2023aae-8514-50e4-9b38-8d72d7a2ebfe', now() - interval '132 days'),
('e3c9d64d-7529-5687-ba47-db045c7b638a', 'b2023aae-8514-50e4-9b38-8d72d7a2ebfe', now() - interval '129 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  'b0756341-d9c4-5da2-b73a-b49074c37767', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'Amores impossíveis', null,
  '💔', 'public', false,
  null,
  now() - interval '105 days', now() - interval '105 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('b0756341-d9c4-5da2-b73a-b49074c37767', '4321a6a7-49eb-5067-b380-7767f362b3e0', 'a0', null, 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', now() - interval '105 days'),
('b0756341-d9c4-5da2-b73a-b49074c37767', '68c7e16e-6b1e-54f7-9662-e4122baaaf7a', 'a1', null, 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', now() - interval '104 days'),
('b0756341-d9c4-5da2-b73a-b49074c37767', '10be477c-b383-5b58-8c0d-11ad3b2b79bc', 'a2', null, 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', now() - interval '103 days'),
('b0756341-d9c4-5da2-b73a-b49074c37767', '2de73965-3a22-5588-8eba-b271d075e042', 'a3', null, 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', now() - interval '102 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'b0756341-d9c4-5da2-b73a-b49074c37767', now() - interval '102 days')
on conflict do nothing;

insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  'c311bc9d-8d03-573b-8246-33e007319f96', 'f362edf4-53ed-5763-aca5-367ea784f749', 'Futuros que dão medo', 'Distopias para ler com a luz acesa.',
  '🌒', 'public', false,
  'c5b5b2e7-9138-5af5-9f32-4ee7d8abd069',
  now() - interval '98 days', now() - interval '98 days'
) on conflict (id) do nothing;
insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
('c311bc9d-8d03-573b-8246-33e007319f96', 'f0714c11-2bab-5f35-b265-216ae24f060b', 'a0', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '98 days'),
('c311bc9d-8d03-573b-8246-33e007319f96', '73ba12f6-33da-5a45-8402-fc3c784df1ab', 'a1', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '97 days'),
('c311bc9d-8d03-573b-8246-33e007319f96', 'ffc913fb-2e10-5be3-bc7c-bded2a3b87d4', 'a2', null, 'f362edf4-53ed-5763-aca5-367ea784f749', now() - interval '96 days')
on conflict do nothing;
insert into public.collection_likes (user_id, collection_id, created_at) values
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'c311bc9d-8d03-573b-8246-33e007319f96', now() - interval '95 days'),
('b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'c311bc9d-8d03-573b-8246-33e007319f96', now() - interval '92 days'),
('b1c25f00-2b61-5bd5-af55-3bf0f55ddadc', 'c311bc9d-8d03-573b-8246-33e007319f96', now() - interval '89 days'),
('f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'c311bc9d-8d03-573b-8246-33e007319f96', now() - interval '86 days')
on conflict do nothing;
insert into public.collection_saves (user_id, collection_id, created_at) values
('e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'c311bc9d-8d03-573b-8246-33e007319f96', now() - interval '94 days')
on conflict do nothing;

-- Datas do feed e dos avisos
update public.activities as a set created_at = ub.created_at
from public.user_books as ub
where a.actor_id = ub.user_id and a.book_id = ub.book_id
  and a.type = 'shelf_' || ub.status and ub.user_id in ('8f557e4a-1bd6-500d-956f-20aca9f39731', 'f362edf4-53ed-5763-aca5-367ea784f749', '662411c7-eeab-59a4-930c-a1e09cf8ab33', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'e3c9d64d-7529-5687-ba47-db045c7b638a', 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc');

update public.activities as a set created_at = c.created_at
from public.collections as c
where a.type = 'collection_create' and a.collection_id = c.id and c.id in ('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '934fa723-20d1-53d8-acc8-0c2e171c50a4', 'c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', 'c311bc9d-8d03-573b-8246-33e007319f96', '6553e79f-d2b5-54a0-81c0-9ab344c337d4', 'f45efa6b-d823-5510-829d-7589d466c0bc', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', 'de846290-c356-566a-a9e2-15bcc9cfa478', 'b2023aae-8514-50e4-9b38-8d72d7a2ebfe', 'b0756341-d9c4-5da2-b73a-b49074c37767');

update public.activities as a set created_at = i.added_at
from public.collection_items as i
where a.type = 'collection_add' and a.collection_id = i.collection_id and a.book_id = i.book_id
  and i.collection_id in ('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '934fa723-20d1-53d8-acc8-0c2e171c50a4', 'c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', 'c311bc9d-8d03-573b-8246-33e007319f96', '6553e79f-d2b5-54a0-81c0-9ab344c337d4', 'f45efa6b-d823-5510-829d-7589d466c0bc', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', 'de846290-c356-566a-a9e2-15bcc9cfa478', 'b2023aae-8514-50e4-9b38-8d72d7a2ebfe', 'b0756341-d9c4-5da2-b73a-b49074c37767');

update public.activities as a set created_at = f.created_at
from public.follows as f
where a.type = 'follow' and a.actor_id = f.follower_id and a.target_user_id = f.following_id
  and f.follower_id in ('8f557e4a-1bd6-500d-956f-20aca9f39731', 'f362edf4-53ed-5763-aca5-367ea784f749', '662411c7-eeab-59a4-930c-a1e09cf8ab33', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'e3c9d64d-7529-5687-ba47-db045c7b638a', 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc');

update public.notifications as n set created_at = f.created_at
from public.follows as f
where n.type in ('follow', 'follow_request') and n.actor_id = f.follower_id
  and n.user_id = f.following_id and f.follower_id in ('8f557e4a-1bd6-500d-956f-20aca9f39731', 'f362edf4-53ed-5763-aca5-367ea784f749', '662411c7-eeab-59a4-930c-a1e09cf8ab33', 'b20bdce3-bcf4-5eed-9a85-7b0fa2eba1fc', 'e42289dd-2468-50e1-b1c6-1ed46d5a942c', 'e3c9d64d-7529-5687-ba47-db045c7b638a', 'f5771a8e-f340-54a6-acb5-31f0efdbd0d2', 'b1c25f00-2b61-5bd5-af55-3bf0f55ddadc');

update public.notifications as n set created_at = l.created_at
from public.collection_likes as l
where n.type = 'collection_like' and n.actor_id = l.user_id
  and n.refs ->> 'collection_id' = l.collection_id::text and l.collection_id in ('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '934fa723-20d1-53d8-acc8-0c2e171c50a4', 'c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', 'c311bc9d-8d03-573b-8246-33e007319f96', '6553e79f-d2b5-54a0-81c0-9ab344c337d4', 'f45efa6b-d823-5510-829d-7589d466c0bc', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', 'de846290-c356-566a-a9e2-15bcc9cfa478', 'b2023aae-8514-50e4-9b38-8d72d7a2ebfe', 'b0756341-d9c4-5da2-b73a-b49074c37767');

update public.notifications as n set created_at = c.created_at
from public.collections as c
where n.type = 'collection_copy' and n.refs ->> 'copy_id' = c.id::text and c.id in ('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '934fa723-20d1-53d8-acc8-0c2e171c50a4', 'c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', 'c311bc9d-8d03-573b-8246-33e007319f96', '6553e79f-d2b5-54a0-81c0-9ab344c337d4', 'f45efa6b-d823-5510-829d-7589d466c0bc', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', 'de846290-c356-566a-a9e2-15bcc9cfa478', 'b2023aae-8514-50e4-9b38-8d72d7a2ebfe', 'b0756341-d9c4-5da2-b73a-b49074c37767');

update public.notifications as n set created_at = m.created_at
from public.collection_members as m
where n.type = 'collection_invite' and n.user_id = m.user_id
  and n.refs ->> 'collection_id' = m.collection_id::text and m.collection_id in ('e24a4efa-193a-5b79-bc92-6bf71f7bdca7', '934fa723-20d1-53d8-acc8-0c2e171c50a4', 'c5b5b2e7-9138-5af5-9f32-4ee7d8abd069', 'c311bc9d-8d03-573b-8246-33e007319f96', '6553e79f-d2b5-54a0-81c0-9ab344c337d4', 'f45efa6b-d823-5510-829d-7589d466c0bc', '93a74b60-7ea9-5fc2-aace-1b162048ed5f', 'de846290-c356-566a-a9e2-15bcc9cfa478', 'b2023aae-8514-50e4-9b38-8d72d7a2ebfe', 'b0756341-d9c4-5da2-b73a-b49074c37767');
