-- =====================================================================
-- BASECAMP PEMUDA RW 05 — Fungsi publik, storage, katalog achievement
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fungsi publik (anon). Hanya mengembalikan agregat / kolom aman.
-- ---------------------------------------------------------------------
create or replace function public.public_stats(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  with o as (select id from public.organizations where slug = p_slug)
  select jsonb_build_object(
    'members_active', (select count(*) from public.members m, o where m.organization_id = o.id and m.status = 'ACTIVE'),
    'activities_this_year', (select count(*) from public.events e, o where e.organization_id = o.id
        and e.status <> 'DRAFT' and e.status <> 'CANCELLED'
        and extract(year from e.start_date at time zone 'Asia/Jakarta') = extract(year from now() at time zone 'Asia/Jakarta')),
    'events_this_year', (select count(*) from public.events e, o where e.organization_id = o.id and e.kind = 'EVENT'
        and e.status <> 'DRAFT' and e.status <> 'CANCELLED'
        and extract(year from e.start_date at time zone 'Asia/Jakarta') = extract(year from now() at time zone 'Asia/Jakarta')),
    'events_active', (select count(*) from public.events e, o where e.organization_id = o.id and e.kind = 'EVENT' and e.status in ('PLANNING','READY','ONGOING')),
    'inventory_units', (select count(*) from public.inventory_units u, o where u.organization_id = o.id and u.status <> 'LOST'),
    'inventory_items', (select count(*) from public.inventory_items i, o where i.organization_id = o.id and not i.is_archived),
    'documents_public', (select count(*) from public.documents d, o where d.organization_id = o.id and d.visibility = 'PUBLIC'),
    'metrics', (select public.org_metrics(o.id) from o)
  )
$$;

-- Saldo kas organisasi = akun non-event, dihitung dari transaksi approved.
create or replace function public.public_finance_summary(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  with o as (select id from public.organizations where slug = p_slug),
  kas as (select a.id from public.finance_accounts a, o where a.organization_id = o.id and a.type <> 'EVENT'),
  month_start as (select date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date as d)
  select jsonb_build_object(
    'balance', (select coalesce(sum(public.account_balance(k.id)), 0) from kas k),
    'income_month', (select coalesce(sum(t.amount), 0) from public.finance_transactions t, month_start m
        where t.is_approved and t.type = 'INCOME' and t.account_id in (select id from kas) and t.transaction_date >= m.d),
    'expense_month', (select coalesce(sum(t.amount), 0) from public.finance_transactions t, month_start m
        where t.is_approved and t.type = 'EXPENSE' and t.account_id in (select id from kas) and t.transaction_date >= m.d),
    'events_active', (select count(*) from public.events e, o where e.organization_id = o.id and e.kind = 'EVENT' and e.status in ('PLANNING','READY','ONGOING')),
    'updated_at', (select max(t.approved_at) from public.finance_transactions t, o where t.organization_id = o.id and t.is_approved)
  )
$$;

create or replace function public.public_cashflow(p_slug text, p_months integer default 6)
returns table (month date, income numeric, expense numeric) language sql stable security definer set search_path = public as $$
  with o as (select id from public.organizations where slug = p_slug),
  kas as (select a.id from public.finance_accounts a, o where a.organization_id = o.id and a.type <> 'EVENT'),
  months as (
    select generate_series(
      date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date - make_interval(months => greatest(least(p_months, 24), 1) - 1),
      date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date,
      interval '1 month')::date as m
  )
  select mo.m,
    coalesce(sum(t.amount) filter (where t.type = 'INCOME'), 0)::numeric(14,2),
    coalesce(sum(t.amount) filter (where t.type = 'EXPENSE'), 0)::numeric(14,2)
  from months mo
  left join public.finance_transactions t
    on t.is_approved and t.account_id in (select id from kas)
   and date_trunc('month', t.transaction_date)::date = mo.m
  group by mo.m order by mo.m
$$;

create or replace function public.public_transactions(p_slug text, p_limit integer default 8)
returns table (transaction_code text, transaction_date date, type public.finance_type, category text, amount numeric,
               description text, event_name text) language sql stable security definer set search_path = public as $$
  select t.transaction_code, t.transaction_date, t.type, c.name, t.amount, t.description, e.name
    from public.finance_transactions t
    join public.organizations o on o.id = t.organization_id and o.slug = p_slug
    left join public.finance_categories c on c.id = t.category_id
    left join public.events e on e.id = t.event_id
   where t.is_public and t.is_approved and t.type <> 'TRANSFER'
   order by t.transaction_date desc, t.created_at desc
   limit least(greatest(p_limit, 1), 50)
$$;

create or replace function public.public_event_finance(p_event uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('budget', s.budget, 'income', s.income, 'expense', s.expense,
                            'remaining_budget', s.remaining_budget, 'budget_used_pct', s.budget_used_pct)
    from public.event_finance_summary s
    join public.events e on e.id = s.event_id
   where s.event_id = p_event and e.is_public and e.status <> 'DRAFT'
$$;

create or replace function public.public_event_progress(p_event uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', count(t.id), 'done', count(t.id) filter (where t.is_done))
    from public.events e left join public.event_tasks t on t.event_id = e.id
   where e.id = p_event and e.is_public and e.status <> 'DRAFT'
   group by e.id
$$;

create or replace function public.public_unit_lookup(p_slug text, p_code text)
returns table (unit_code text, status public.unit_status, condition public.item_condition, item_name text,
               item_photo text, category text, unit_label text, location text) language sql stable security definer set search_path = public as $$
  select u.unit_code, u.status, u.condition, i.name, i.photo, c.name, i.unit_label, i.location
    from public.inventory_units u
    join public.inventory_items i on i.id = u.inventory_item_id
    join public.organizations o on o.id = u.organization_id and o.slug = p_slug
    left join public.inventory_categories c on c.id = i.category_id
   where upper(u.unit_code) = upper(p_code)
   limit 1
$$;

create or replace function public.public_inventory_summary(p_slug text)
returns table (name text, category text, total integer, available integer, photo text) language sql stable security definer set search_path = public as $$
  select i.name, c.name, i.total_quantity, i.available_quantity, i.photo
    from public.inventory_items i
    join public.organizations o on o.id = i.organization_id and o.slug = p_slug
    left join public.inventory_categories c on c.id = i.category_id
   where not i.is_archived and coalesce((o.settings->>'public_inventory_summary')::boolean, false)
   order by i.total_quantity desc, i.name
$$;

create or replace function public.public_activity_feed(p_slug text, p_limit integer default 6)
returns table (kind text, title text, happened_at timestamptz, link text) language sql stable security definer set search_path = public as $$
  (
    select 'event'::text, e.name || case e.status when 'COMPLETED' then ' telah terlaksana' when 'ONGOING' then ' sedang berlangsung' else ' dijadwalkan' end,
           greatest(e.updated_at, e.created_at), '/kegiatan/' || e.slug
      from public.events e join public.organizations o on o.id = e.organization_id and o.slug = p_slug
     where e.is_public and e.status <> 'DRAFT'
  union all
    select 'document'::text, 'Dokumentasi baru: ' || coalesce(d.caption, 'foto kegiatan'), d.created_at, '/dokumentasi'
      from public.documents d join public.organizations o on o.id = d.organization_id and o.slug = p_slug
     where d.visibility = 'PUBLIC'
  union all
    select 'finance'::text, 'Laporan kas: ' || coalesce(c.name, 'transaksi') || ' dicatat', t.approved_at, '/transparansi'
      from public.finance_transactions t join public.organizations o on o.id = t.organization_id and o.slug = p_slug
      left join public.finance_categories c on c.id = t.category_id
     where t.is_public and t.is_approved and t.type <> 'TRANSFER'
  )
  order by 3 desc nulls last
  limit least(greatest(p_limit, 1), 20)
$$;

grant execute on function
  public.public_stats(text), public.public_finance_summary(text), public.public_cashflow(text, integer),
  public.public_transactions(text, integer), public.public_event_finance(uuid), public.public_event_progress(uuid),
  public.public_unit_lookup(text, text), public.public_inventory_summary(text), public.public_activity_feed(text, integer),
  public.account_balance(uuid), public.org_metrics(uuid)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- STORAGE
-- media        : publik (cover event, foto barang) — non-sensitif
-- documentation: privat, dibaca publik hanya jika dokumen PUBLIC
-- avatars      : privat, anggota organisasi
-- attachments  : privat, bukti transaksi (keuangan)
-- Struktur path: <organization_id>/<...>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('documentation', 'documentation', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp']),
  ('attachments', 'attachments', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "media read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');
create policy "media write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role(array['SUPER_ADMIN','PENGURUS','PANITIA']::public.app_role[]));
create policy "media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]));

create policy "documentation public read" on storage.objects for select to anon
  using (bucket_id = 'documentation' and exists (
    select 1 from public.documents d where d.file_path = name and d.visibility = 'PUBLIC'));
create policy "documentation member read" on storage.objects for select to authenticated
  using (bucket_id = 'documentation' and (
    (storage.foldername(name))[1] = public.auth_org_id()::text
    or exists (select 1 from public.documents d where d.file_path = name and d.visibility = 'PUBLIC')));
create policy "documentation write" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentation' and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role(array['SUPER_ADMIN','PENGURUS','PANITIA']::public.app_role[]));
create policy "documentation delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documentation' and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role(array['SUPER_ADMIN','PENGURUS','PANITIA']::public.app_role[]));

create policy "avatars member read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.auth_org_id()::text);
create policy "avatars write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]));
create policy "avatars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]));

create policy "attachments finance read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role(array['SUPER_ADMIN','PENGURUS','BENDAHARA']::public.app_role[]));
create policy "attachments write" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role(array['SUPER_ADMIN','PENGURUS','BENDAHARA','PANITIA']::public.app_role[]));

-- ---------------------------------------------------------------------
-- Katalog achievement organisasi (bukan ranking individu)
-- ---------------------------------------------------------------------
insert into public.achievements (code, name, description, metric, threshold, icon, tier, sort_order) values
  ('BASECAMP_READY',   'Basecamp Ready',   '50 unit inventaris terdaftar di basecamp.',      'inventory_units',      50,  'warehouse',     'bronze', 1),
  ('INVENTORY_GUARD',  'Inventory Guard',  '100 unit inventaris tercatat rapi lengkap dengan QR.', 'inventory_units', 100, 'shield-check', 'silver', 2),
  ('CASH_KEEPER',      'Cash Keeper',      '100 transaksi kas tercatat dan disetujui.',      'transactions',         100, 'wallet',        'silver', 3),
  ('EVENT_MASTER',     'Event Master',     '10 event besar selesai digelar.',                'events_completed',     10,  'party-popper',  'gold',   4),
  ('COMMUNITY_ACTIVE', 'Community Active', '20 kegiatan pemuda selesai terlaksana.',         'activities_completed', 20,  'users',         'gold',   5),
  ('FULL_SQUAD',       'Full Squad',       '40 anggota aktif bergabung di basecamp.',        'members_active',       40,  'users-round',   'silver', 6),
  ('STORY_TELLER',     'Story Teller',     '30 foto dokumentasi kegiatan terarsip.',         'documents',            30,  'camera',        'bronze', 7),
  ('QUEST_RUNNER',     'Quest Runner',     '50 quest checklist event diselesaikan.',         'tasks_done',           50,  'list-checks',   'bronze', 8),
  ('TRUSTED_LENDER',   'Trusted Lender',   '15 peminjaman barang dikembalikan tuntas.',      'borrowings_returned',  15,  'handshake',     'bronze', 9)
on conflict (code) do nothing;
