-- =====================================================================
-- BASECAMP PEMUDA RW 05 — Helper otorisasi, business rule, audit
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper otorisasi (SECURITY DEFINER agar tidak rekursif terhadap RLS)
-- ---------------------------------------------------------------------
create or replace function public.auth_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and organization_id is not null and role = any(roles)
  )
$$;

create or replace function public.is_event_panitia(p_event uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.event_members em
    join public.profiles p on p.member_id = em.member_id
    where p.id = auth.uid() and em.event_id = p_event
  )
$$;

create or replace function public.can_manage_event(p_event uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[])
      or public.is_event_panitia(p_event)
$$;

create or replace function public.actor_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select full_name from public.profiles where id = auth.uid()), 'Sistem')
$$;

create or replace function public.require_role(roles public.app_role[], msg text default 'Akses ditolak untuk peran Anda.')
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return; -- service role / migration
  end if;
  if not public.has_role(roles) then
    raise exception using errcode = '42501', message = msg;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Profil otomatis untuk user baru (tanpa organisasi & peran terendah).
-- Penetapan organisasi/peran dilakukan SUPER_ADMIN.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.role is distinct from old.role
      or new.organization_id is distinct from old.organization_id
      or new.member_id is distinct from old.member_id) then
    if not (public.has_role(array['SUPER_ADMIN']::public.app_role[])
            and old.organization_id is not distinct from public.auth_org_id()
            and new.organization_id is not distinct from public.auth_org_id()) then
      raise exception using errcode = '42501', message = 'Hanya Super Admin yang dapat mengubah peran atau organisasi pengguna.';
    end if;
    if new.id = auth.uid() and new.role <> 'SUPER_ADMIN' then
      raise exception using errcode = '42501', message = 'Super Admin tidak dapat menurunkan perannya sendiri.';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- Counter kode
-- ---------------------------------------------------------------------
create sequence if not exists public.finance_tx_seq;

create or replace function public.next_org_counter(p_org uuid, p_key text)
returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  insert into public.org_counters (organization_id, key, value)
  values (p_org, p_key, 1)
  on conflict (organization_id, key) do update set value = public.org_counters.value + 1
  returning value into v;
  return v;
end $$;

-- ---------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------
create or replace function public.write_audit(
  p_org uuid, p_action text, p_entity text, p_entity_id uuid, p_summary text, p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (organization_id, actor_id, actor_name, action, entity, entity_id, summary, metadata)
  values (p_org, auth.uid(), public.actor_name(), p_action, p_entity, p_entity_id, p_summary, coalesce(p_metadata, '{}'::jsonb));
end $$;

-- TG_ARGV[0] = label entitas (Bahasa Indonesia), TG_ARGV[1] = kolom label
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_label_col text := tg_argv[1];
  v_ignore text[] := array['updated_at'] || coalesce(string_to_array(nullif(tg_argv[2], ''), ','), array[]::text[]);
  v_entity text := tg_argv[0];
  v_row jsonb;
  v_old jsonb;
  v_diff jsonb;
  v_label text;
  v_action text;
  v_summary text;
  v_actor text := public.actor_name();
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  v_label := coalesce(v_row->>v_label_col, v_row->>'id');

  if tg_op = 'INSERT' then
    v_action := 'CREATE';
    v_summary := format('%s menambahkan %s "%s".', v_actor, v_entity, v_label);
    v_diff := '{}'::jsonb;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}'::jsonb)
      into v_diff
      from jsonb_each(v_row) n
      join jsonb_each(v_old) o using (key)
     where n.value is distinct from o.value and not (n.key = any(v_ignore));
    if v_diff = '{}'::jsonb then
      return null;
    end if;
    v_action := 'UPDATE';
    if v_diff ? 'status' then
      v_summary := format('%s mengubah status %s "%s" dari %s menjadi %s.', v_actor, v_entity, v_label,
                          v_diff->'status'->>'from', v_diff->'status'->>'to');
    elsif v_diff ? 'is_approved' and (v_diff->'is_approved'->>'to')::boolean then
      v_action := 'APPROVE';
      v_summary := format('%s menyetujui %s "%s".', v_actor, v_entity, v_label);
    elsif v_diff ? 'role' then
      v_summary := format('%s mengubah peran %s "%s" dari %s menjadi %s.', v_actor, v_entity, v_label,
                          v_diff->'role'->>'from', v_diff->'role'->>'to');
    else
      v_summary := format('%s memperbarui %s "%s" (%s).', v_actor, v_entity, v_label,
                          (select string_agg(k, ', ') from jsonb_object_keys(v_diff) k));
    end if;
  else
    v_action := 'DELETE';
    v_summary := format('%s menghapus %s "%s".', v_actor, v_entity, v_label);
    v_diff := jsonb_build_object('deleted', v_row);
  end if;

  insert into public.audit_logs (organization_id, actor_id, actor_name, action, entity, entity_id, summary, metadata)
  values ((v_row->>'organization_id')::uuid, auth.uid(), v_actor, v_action, tg_table_name,
          (v_row->>'id')::uuid, v_summary, jsonb_build_object('changes', v_diff));
  return null;
end $$;

create trigger audit_finance_transactions after insert or update or delete on public.finance_transactions
  for each row execute function public.audit_trigger('transaksi', 'transaction_code');
create trigger audit_finance_categories after insert or update or delete on public.finance_categories
  for each row execute function public.audit_trigger('kategori keuangan', 'name');
create trigger audit_finance_accounts after insert or update or delete on public.finance_accounts
  for each row execute function public.audit_trigger('akun kas', 'name');
create trigger audit_events after insert or update or delete on public.events
  for each row execute function public.audit_trigger('event', 'name');
create trigger audit_inventory_items after insert or update or delete on public.inventory_items
  for each row execute function public.audit_trigger('barang', 'name', 'total_quantity,available_quantity,status');
create trigger audit_inventory_units after insert or update or delete on public.inventory_units
  for each row execute function public.audit_trigger('unit', 'unit_code');
create trigger audit_borrowings after insert or update or delete on public.borrowings
  for each row execute function public.audit_trigger('peminjaman', 'borrowing_code');
create trigger audit_inventory_maintenance after insert or update or delete on public.inventory_maintenance
  for each row execute function public.audit_trigger('maintenance', 'issue');
create trigger audit_members after insert or update or delete on public.members
  for each row execute function public.audit_trigger('anggota', 'name');
create trigger audit_documents after insert or update or delete on public.documents
  for each row execute function public.audit_trigger('dokumentasi', 'caption');
create trigger audit_profiles after update on public.profiles
  for each row execute function public.audit_trigger('pengguna', 'full_name');

-- ---------------------------------------------------------------------
-- FINANCE
-- ---------------------------------------------------------------------
create or replace function public.account_balance(p_account uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(
    case
      when t.account_id = p_account and t.type = 'INCOME' then t.amount
      when t.account_id = p_account and t.type in ('EXPENSE','TRANSFER') then -t.amount
      when t.to_account_id = p_account and t.type = 'TRANSFER' then t.amount
      else 0
    end), 0)::numeric(14,2)
  from public.finance_transactions t
  where t.is_approved and (t.account_id = p_account or t.to_account_id = p_account)
$$;

create or replace view public.finance_account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.organization_id,
  a.name,
  a.type,
  a.event_id,
  a.is_active,
  coalesce(sum(case when t.account_id = a.id and t.type = 'INCOME' then t.amount else 0 end), 0)::numeric(14,2) as total_income,
  coalesce(sum(case when t.account_id = a.id and t.type = 'EXPENSE' then t.amount else 0 end), 0)::numeric(14,2) as total_expense,
  coalesce(sum(case when t.to_account_id = a.id then t.amount else 0 end), 0)::numeric(14,2) as transfer_in,
  coalesce(sum(case when t.account_id = a.id and t.type = 'TRANSFER' then t.amount else 0 end), 0)::numeric(14,2) as transfer_out,
  coalesce(sum(case
      when t.account_id = a.id and t.type = 'INCOME' then t.amount
      when t.account_id = a.id and t.type in ('EXPENSE','TRANSFER') then -t.amount
      when t.to_account_id = a.id then t.amount else 0 end), 0)::numeric(14,2) as balance
from public.finance_accounts a
left join public.finance_transactions t
  on t.is_approved and (t.account_id = a.id or t.to_account_id = a.id)
group by a.id;

create or replace view public.event_finance_summary
with (security_invoker = true) as
select
  e.id as event_id,
  e.organization_id,
  e.name,
  e.budget,
  b.account_id,
  coalesce(b.total_income, 0) as income,
  coalesce(b.total_expense, 0) as expense,
  coalesce(b.transfer_in, 0) as transfer_in,
  coalesce(b.transfer_out, 0) as transfer_out,
  coalesce(b.balance, 0) as balance,
  (e.budget - coalesce(b.total_expense, 0))::numeric(14,2) as remaining_budget,
  case when e.budget > 0 then round(coalesce(b.total_expense, 0) * 100 / e.budget, 1) else 0 end as budget_used_pct
from public.events e
left join public.finance_account_balances b on b.event_id = e.id;

create or replace function public.finance_tx_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_acc public.finance_accounts;
  v_to public.finance_accounts;
  v_cat public.finance_categories;
  v_event public.events;
  v_strict boolean;
  v_balance numeric;
  v_is_privileged boolean := auth.uid() is null or public.has_role(array['SUPER_ADMIN']::public.app_role[]);
  v_can_approve boolean := auth.uid() is null or public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[]);
begin
  -- Perubahan transaksi yang sudah disetujui dibatasi.
  if tg_op = 'UPDATE' and old.is_approved then
    if (new.amount, new.type, new.account_id, new.to_account_id, new.transaction_date, new.category_id, new.event_id, new.transaction_code)
       is distinct from
       (old.amount, old.type, old.account_id, old.to_account_id, old.transaction_date, old.category_id, old.event_id, old.transaction_code)
       and not v_is_privileged then
      raise exception using errcode = '42501',
        message = 'Transaksi yang sudah disetujui tidak dapat diubah. Gunakan reversal untuk koreksi.';
    end if;
    if not new.is_approved and not v_is_privileged then
      raise exception using errcode = '42501', message = 'Persetujuan transaksi tidak dapat dibatalkan.';
    end if;
  end if;

  select * into v_acc from public.finance_accounts where id = new.account_id;
  if v_acc.id is null or v_acc.organization_id <> new.organization_id then
    raise exception 'Akun kas tidak valid untuk organisasi ini.';
  end if;
  if not v_acc.is_active then
    raise exception 'Akun kas "%" sedang nonaktif.', v_acc.name;
  end if;

  if new.type = 'TRANSFER' then
    select * into v_to from public.finance_accounts where id = new.to_account_id;
    if v_to.id is null or v_to.organization_id <> new.organization_id then
      raise exception 'Akun tujuan transfer tidak valid.';
    end if;
    new.category_id := null;
  else
    select * into v_cat from public.finance_categories where id = new.category_id;
    if v_cat.id is null or v_cat.organization_id <> new.organization_id then
      raise exception 'Kategori wajib dipilih.';
    end if;
    if v_cat.type::text <> new.type::text then
      raise exception 'Kategori "%" bukan kategori %.', v_cat.name, case when new.type = 'INCOME' then 'pemasukan' else 'pengeluaran' end;
    end if;
  end if;

  -- Transaksi event wajib memakai akun event itu sendiri (tidak tercampur).
  if v_acc.type = 'EVENT' then
    if new.type <> 'TRANSFER' then
      new.event_id := v_acc.event_id;
    end if;
  elsif new.type <> 'TRANSFER' and new.event_id is not null then
    raise exception 'Transaksi event harus dicatat di akun dana event tersebut.';
  end if;
  if new.type = 'TRANSFER' then
    new.event_id := coalesce(v_to.event_id, v_acc.event_id);
  end if;

  if new.event_id is not null then
    select * into v_event from public.events where id = new.event_id;
    if v_event.organization_id <> new.organization_id then
      raise exception 'Event tidak valid.';
    end if;
    if tg_op = 'INSERT' and v_event.status = 'COMPLETED' and not v_is_privileged then
      raise exception using errcode = '42501', message = format('Event "%s" sudah selesai. Transaksi baru butuh izin Super Admin.', v_event.name);
    end if;
    if tg_op = 'INSERT' and v_event.status = 'CANCELLED' and new.type <> 'TRANSFER' then
      raise exception 'Event "%" dibatalkan dan tidak menerima transaksi baru.', v_event.name;
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.transaction_code is null or new.transaction_code = '' then
      new.transaction_code := case new.type when 'INCOME' then 'IN' when 'EXPENSE' then 'EX' else 'TF' end
        || '-' || to_char(new.transaction_date, 'YYMM') || '-' || lpad(nextval('public.finance_tx_seq')::text, 5, '0');
    end if;
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
  end if;

  -- Persetujuan
  if new.is_approved and (tg_op = 'INSERT' or not old.is_approved) then
    if not v_can_approve then
      raise exception using errcode = '42501', message = 'Hanya Bendahara atau Super Admin yang dapat menyetujui transaksi.';
    end if;
    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  if not new.is_approved then
    new.approved_by := null;
    new.approved_at := null;
    new.is_public := false; -- hanya transaksi disetujui yang boleh publik
  end if;

  -- Strict balance: saldo akun tidak boleh negatif.
  if new.is_approved and new.type in ('EXPENSE','TRANSFER') then
    select coalesce((settings->>'strict_balance')::boolean, true) into v_strict
      from public.organizations where id = new.organization_id;
    if v_strict then
      perform pg_advisory_xact_lock(hashtext(new.account_id::text));
      v_balance := public.account_balance(new.account_id);
      if tg_op = 'UPDATE' and old.is_approved and old.account_id = new.account_id and old.type in ('EXPENSE','TRANSFER') then
        v_balance := v_balance + old.amount;
      end if;
      if v_balance - new.amount < 0 then
        raise exception using errcode = 'P0001',
          message = format('Saldo %s tidak cukup (tersedia Rp %s).', v_acc.name, to_char(v_balance, 'FM999G999G999G990'));
      end if;
    end if;
  end if;

  return new;
end $$;

create trigger finance_tx_before_write
before insert or update on public.finance_transactions
for each row execute function public.finance_tx_before_write();

create or replace function public.finance_tx_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_balance numeric;
begin
  if old.is_approved then
    if auth.uid() is not null and not public.has_role(array['SUPER_ADMIN']::public.app_role[]) then
      raise exception using errcode = '42501',
        message = 'Transaksi yang sudah disetujui tidak dapat dihapus. Gunakan reversal.';
    end if;
    if old.type in ('INCOME','TRANSFER') then
      v_balance := public.account_balance(coalesce(old.to_account_id, old.account_id));
      if v_balance - old.amount < 0 then
        raise exception 'Menghapus transaksi ini membuat saldo negatif. Gunakan reversal.';
      end if;
    end if;
  end if;
  if exists (select 1 from public.finance_transactions where reversal_of = old.id) then
    raise exception 'Transaksi ini sudah memiliki reversal dan tidak dapat dihapus.';
  end if;
  return old;
end $$;

create trigger finance_tx_before_delete
before delete on public.finance_transactions
for each row execute function public.finance_tx_before_delete();

create unique index fin_tx_reversal_uidx on public.finance_transactions (reversal_of) where reversal_of is not null;

-- Reversal: koreksi transaksi approved dengan transaksi kebalikan.
create or replace function public.reverse_transaction(p_tx uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.finance_transactions;
  v_cat uuid;
  v_new uuid;
begin
  perform public.require_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[], 'Hanya Bendahara atau Super Admin yang dapat melakukan reversal.');
  select * into t from public.finance_transactions where id = p_tx for update;
  if t.id is null or t.organization_id is distinct from coalesce(public.auth_org_id(), t.organization_id) then
    raise exception 'Transaksi tidak ditemukan.';
  end if;
  if not t.is_approved then
    raise exception 'Transaksi belum disetujui; cukup edit atau hapus.';
  end if;
  if t.reversal_of is not null then
    raise exception 'Transaksi reversal tidak dapat di-reversal lagi.';
  end if;

  if t.type <> 'TRANSFER' then
    insert into public.finance_categories (organization_id, name, type, color, description)
    values (t.organization_id, 'Koreksi / Reversal',
            case when t.type = 'INCOME' then 'EXPENSE'::public.category_type else 'INCOME'::public.category_type end,
            '#8B5E3C', 'Dibuat otomatis untuk koreksi transaksi.')
    on conflict (organization_id, type, name) do update set is_active = true
    returning id into v_cat;
  end if;

  insert into public.finance_transactions (
    organization_id, transaction_date, type, category_id, amount, description, event_id,
    account_id, to_account_id, payment_method, reversal_of, is_approved, is_public
  ) values (
    t.organization_id, current_date,
    case t.type when 'INCOME' then 'EXPENSE'::public.finance_type when 'EXPENSE' then 'INCOME'::public.finance_type else 'TRANSFER'::public.finance_type end,
    v_cat, t.amount,
    format('Reversal %s: %s', t.transaction_code, coalesce(nullif(p_reason, ''), 'koreksi')),
    t.event_id,
    case when t.type = 'TRANSFER' then t.to_account_id else t.account_id end,
    case when t.type = 'TRANSFER' then t.account_id else null end,
    t.payment_method, t.id, true, t.is_public
  ) returning id into v_new;
  return v_new;
end $$;

-- ---------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------
create or replace function public.event_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.finance_accounts (organization_id, name, type, event_id, description)
  values (new.organization_id, left('Dana ' || new.name, 100) || ' #' || left(new.id::text, 4), 'EVENT', new.id,
          'Akun keuangan khusus event ' || new.name);
  return new;
end $$;

create trigger events_after_insert after insert on public.events
for each row execute function public.event_after_insert();

create or replace function public.event_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  if new.end_date < new.start_date then
    raise exception 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  end if;
  if new.budget < 0 then
    raise exception 'Budget tidak boleh negatif.';
  end if;
  if new.status = 'DRAFT' then
    new.is_public := false;
  end if;
  return new;
end $$;

create trigger events_before_write before insert or update on public.events
for each row execute function public.event_before_write();

create or replace function public.event_task_before_write()
returns trigger language plpgsql as $$
begin
  if new.is_done and (tg_op = 'INSERT' or not old.is_done) then
    new.done_at := now();
  elsif not new.is_done then
    new.done_at := null;
  end if;
  return new;
end $$;

create trigger event_tasks_before_write before insert or update on public.event_tasks
for each row execute function public.event_task_before_write();

-- ---------------------------------------------------------------------
-- INVENTORY
-- ---------------------------------------------------------------------
create or replace function public.refresh_item_stock(p_item uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
  v_avail integer;
  v_borrowed integer;
  v_maint integer;
  v_archived boolean;
begin
  select count(*) filter (where status <> 'LOST'),
         count(*) filter (where status = 'AVAILABLE'),
         count(*) filter (where status = 'BORROWED'),
         count(*) filter (where status in ('MAINTENANCE','DAMAGED'))
    into v_total, v_avail, v_borrowed, v_maint
    from public.inventory_units where inventory_item_id = p_item;
  select is_archived into v_archived from public.inventory_items where id = p_item;

  update public.inventory_items set
    total_quantity = v_total,
    available_quantity = greatest(v_avail, 0),
    status = case
      when v_archived then 'ARCHIVED'
      when v_total = 0 then 'EMPTY'
      when v_avail = v_total then 'AVAILABLE'
      when v_avail > 0 then 'PARTIAL'
      when v_borrowed > 0 and v_borrowed >= v_maint then 'BORROWED'
      else 'MAINTENANCE'
    end::public.item_status
  where id = p_item;
end $$;

create or replace function public.inventory_unit_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_item public.inventory_items;
begin
  select * into v_item from public.inventory_items where id = new.inventory_item_id;
  if v_item.organization_id <> new.organization_id then
    raise exception 'Unit tidak sesuai organisasi barang.';
  end if;
  -- Kondisi rusak otomatis masuk maintenance; hilang otomatis LOST.
  if new.condition = 'DAMAGED' and new.status = 'AVAILABLE' then
    new.status := 'MAINTENANCE';
  end if;
  if new.condition = 'LOST' then
    new.status := 'LOST';
  end if;
  if tg_op = 'UPDATE' and coalesce(current_setting('app.via_borrowing', true), '') <> 'on' then
    if new.status = 'BORROWED' and old.status <> 'BORROWED' then
      raise exception 'Status BORROWED hanya dapat diatur melalui proses peminjaman.';
    end if;
    if old.status = 'BORROWED' and new.status <> 'BORROWED' then
      raise exception 'Unit sedang dipinjam. Selesaikan melalui proses pengembalian.';
    end if;
  end if;
  return new;
end $$;

create trigger inventory_units_before_write before insert or update on public.inventory_units
for each row execute function public.inventory_unit_before_write();

create or replace function public.inventory_unit_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text := coalesce(nullif(current_setting('app.unit_action', true), ''), null);
  v_ref uuid := nullif(current_setting('app.unit_ref', true), '')::uuid;
  v_note text := nullif(current_setting('app.unit_note', true), '');
begin
  if tg_op = 'DELETE' then
    perform public.refresh_item_stock(old.inventory_item_id);
    return null;
  end if;
  if tg_op = 'INSERT' then
    insert into public.inventory_unit_history (organization_id, inventory_unit_id, action, to_status, to_condition, note, actor_id)
    values (new.organization_id, new.id, 'Unit didaftarkan', new.status, new.condition, new.notes, auth.uid());
  elsif new.status is distinct from old.status or new.condition is distinct from old.condition then
    insert into public.inventory_unit_history (organization_id, inventory_unit_id, action, from_status, to_status,
      from_condition, to_condition, note, reference_id, actor_id)
    values (new.organization_id, new.id, coalesce(v_action, 'Perubahan status/kondisi'), old.status, new.status,
      old.condition, new.condition, v_note, v_ref, auth.uid());
  end if;
  perform public.refresh_item_stock(new.inventory_item_id);
  if tg_op = 'UPDATE' and old.inventory_item_id <> new.inventory_item_id then
    perform public.refresh_item_stock(old.inventory_item_id);
  end if;
  return null;
end $$;

create trigger inventory_units_after_write after insert or update or delete on public.inventory_units
for each row execute function public.inventory_unit_after_write();

create or replace function public.inventory_item_after_archive()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_archived is distinct from old.is_archived then
    perform public.refresh_item_stock(new.id);
  end if;
  return null;
end $$;

create trigger inventory_items_after_archive after update of is_archived on public.inventory_items
for each row execute function public.inventory_item_after_archive();

-- Buat unit dengan kode berurutan: TND-001, TND-002, ...
create or replace function public.create_inventory_units(
  p_item uuid, p_quantity integer, p_condition public.item_condition default 'GOOD'
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_item public.inventory_items;
  v_start integer;
  i integer;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat menambah unit.');
  if p_quantity is null or p_quantity < 1 or p_quantity > 500 then
    raise exception 'Jumlah unit harus antara 1 dan 500.';
  end if;
  if p_condition in ('DAMAGED','LOST') then
    raise exception 'Unit baru harus dalam kondisi layak.';
  end if;
  select * into v_item from public.inventory_items where id = p_item for update;
  if v_item.id is null or (auth.uid() is not null and v_item.organization_id <> public.auth_org_id()) then
    raise exception 'Barang tidak ditemukan.';
  end if;
  select coalesce(max(nullif(regexp_replace(unit_code, '^.*-', ''), '')::integer), 0)
    into v_start
    from public.inventory_units
   where organization_id = v_item.organization_id and unit_code ~ ('^' || v_item.unit_prefix || '-[0-9]+$');
  for i in 1..p_quantity loop
    insert into public.inventory_units (organization_id, inventory_item_id, unit_code, condition, status)
    values (v_item.organization_id, v_item.id,
            v_item.unit_prefix || '-' || lpad((v_start + i)::text, 3, '0'), p_condition, 'AVAILABLE');
  end loop;
  return p_quantity;
end $$;

-- ---------------------------------------------------------------------
-- NOTIFIKASI
-- ---------------------------------------------------------------------
create or replace function public.notify_roles(
  p_org uuid, p_roles public.app_role[], p_type text, p_title text, p_body text, p_link text, p_dedupe text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (organization_id, user_id, type, title, body, link, dedupe_key)
  select p_org, p.id, p_type, p_title, p_body, p_link, p_dedupe
    from public.profiles p
   where p.organization_id = p_org and p.role = any(p_roles)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;

-- ---------------------------------------------------------------------
-- PEMINJAMAN
-- ---------------------------------------------------------------------
create or replace function public.create_borrowing(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.auth_org_id();
  v_id uuid;
  v_code text;
  v_event public.events;
  v_units uuid[];
  v_unit public.inventory_units;
  v_auto boolean := coalesce((p->>'auto_approve')::boolean, false);
  v_status public.borrowing_status := 'REQUESTED';
  u uuid;
begin
  if v_org is null then
    raise exception using errcode = '42501', message = 'Akun Anda belum terhubung ke organisasi.';
  end if;
  select array_agg(distinct x::uuid) into v_units from jsonb_array_elements_text(coalesce(p->'unit_ids', '[]'::jsonb)) x;
  if v_units is null or array_length(v_units, 1) is null then
    raise exception 'Pilih minimal satu unit barang.';
  end if;
  if (p->>'expected_return_date')::date < (p->>'borrow_date')::date then
    raise exception 'Tanggal kembali tidak boleh sebelum tanggal pinjam.';
  end if;
  if nullif(p->>'event_id', '') is not null then
    select * into v_event from public.events where id = (p->>'event_id')::uuid and organization_id = v_org;
    if v_event.id is null then
      raise exception 'Event tidak ditemukan.';
    end if;
    if v_event.status = 'CANCELLED' then
      raise exception 'Event "%" dibatalkan dan tidak dapat menerima peminjaman baru.', v_event.name;
    end if;
    if v_event.status = 'COMPLETED' then
      raise exception 'Event "%" sudah selesai.', v_event.name;
    end if;
  end if;

  foreach u in array v_units loop
    select * into v_unit from public.inventory_units where id = u and organization_id = v_org for update;
    if v_unit.id is null then
      raise exception 'Unit tidak ditemukan.';
    end if;
    if v_unit.status <> 'AVAILABLE' then
      raise exception 'Unit % sedang %, tidak dapat dipinjam.', v_unit.unit_code, v_unit.status;
    end if;
    if exists (
      select 1 from public.borrowing_items bi join public.borrowings b on b.id = bi.borrowing_id
       where bi.inventory_unit_id = u and b.status in ('REQUESTED','APPROVED','BORROWED')
    ) then
      raise exception 'Unit % sudah ada di pengajuan peminjaman lain.', v_unit.unit_code;
    end if;
  end loop;

  if v_auto and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]) then
    v_status := 'APPROVED';
  end if;

  v_code := 'PJM-' || to_char((p->>'borrow_date')::date, 'YYMM') || '-' || lpad(public.next_org_counter(v_org, 'borrowing')::text, 3, '0');
  insert into public.borrowings (organization_id, borrowing_code, borrower_name, borrower_phone, borrower_member_id,
    purpose, event_id, borrow_date, expected_return_date, status, notes, created_by, approved_by, approved_at)
  values (v_org, v_code, trim(p->>'borrower_name'), nullif(trim(coalesce(p->>'borrower_phone', '')), ''),
    nullif(p->>'borrower_member_id', '')::uuid, trim(p->>'purpose'), nullif(p->>'event_id', '')::uuid,
    (p->>'borrow_date')::date, (p->>'expected_return_date')::date, v_status, nullif(p->>'notes', ''),
    auth.uid(), case when v_status = 'APPROVED' then auth.uid() end, case when v_status = 'APPROVED' then now() end)
  returning id into v_id;

  insert into public.borrowing_items (organization_id, borrowing_id, inventory_unit_id)
  select v_org, v_id, x from unnest(v_units) x;

  if v_status = 'REQUESTED' then
    perform public.notify_roles(v_org, array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'BORROWING_REQUEST',
      'Pengajuan peminjaman baru membutuhkan persetujuan.',
      format('%s mengajukan %s unit untuk %s.', trim(p->>'borrower_name'), array_length(v_units, 1), trim(p->>'purpose')),
      '/dashboard/borrowings/' || v_id, 'borrow-req:' || v_id);
  end if;
  return v_id;
end $$;

create or replace function public.approve_borrowing(p_id uuid, p_approve boolean default true, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b public.borrowings;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat menyetujui peminjaman.');
  select * into b from public.borrowings where id = p_id and organization_id = public.auth_org_id() for update;
  if b.id is null then raise exception 'Peminjaman tidak ditemukan.'; end if;
  if b.status <> 'REQUESTED' then raise exception 'Peminjaman sudah diproses (status %).', b.status; end if;
  update public.borrowings set
    status = case when p_approve then 'APPROVED' else 'REJECTED' end::public.borrowing_status,
    approved_by = auth.uid(), approved_at = now(),
    notes = case when p_reason is not null and p_reason <> '' then concat_ws(E'\n', notes, 'Catatan persetujuan: ' || p_reason) else notes end
  where id = p_id;
end $$;

create or replace function public.cancel_borrowing(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.borrowings;
begin
  select * into b from public.borrowings where id = p_id and organization_id = public.auth_org_id() for update;
  if b.id is null then raise exception 'Peminjaman tidak ditemukan.'; end if;
  if not (b.created_by = auth.uid() or public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[])) then
    raise exception using errcode = '42501', message = 'Anda tidak dapat membatalkan peminjaman ini.';
  end if;
  if b.status not in ('REQUESTED','APPROVED') then
    raise exception 'Hanya pengajuan yang belum diserahkan yang dapat dibatalkan.';
  end if;
  update public.borrowings set status = 'CANCELLED' where id = p_id;
end $$;

create or replace function public.handover_borrowing(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.borrowings;
  r record;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat menyerahkan barang.');
  select * into b from public.borrowings where id = p_id and organization_id = public.auth_org_id() for update;
  if b.id is null then raise exception 'Peminjaman tidak ditemukan.'; end if;
  if b.status <> 'APPROVED' then raise exception 'Peminjaman harus disetujui sebelum barang diserahkan.'; end if;

  perform set_config('app.via_borrowing', 'on', true);
  perform set_config('app.unit_action', 'Dipinjam (' || b.borrowing_code || ')', true);
  perform set_config('app.unit_ref', b.id::text, true);
  perform set_config('app.unit_note', b.borrower_name || ' — ' || b.purpose, true);

  for r in
    select bi.id as bi_id, u.* from public.borrowing_items bi
    join public.inventory_units u on u.id = bi.inventory_unit_id
    where bi.borrowing_id = p_id
    for update of u
  loop
    if r.status <> 'AVAILABLE' then
      raise exception 'Unit % sedang %, tidak dapat diserahkan.', r.unit_code, r.status;
    end if;
    update public.borrowing_items set condition_before = r.condition where id = r.bi_id;
    update public.inventory_units set status = 'BORROWED' where id = r.id;
  end loop;

  update public.borrowings set status = 'BORROWED' where id = p_id;
  perform set_config('app.via_borrowing', '', true);
  perform set_config('app.unit_action', '', true);
  perform set_config('app.unit_ref', '', true);
  perform set_config('app.unit_note', '', true);
end $$;

-- p_items: [{ "unit_id": uuid, "condition_after": "GOOD", "notes": "..." }]
create or replace function public.return_borrowing(p_id uuid, p_items jsonb, p_return_date date default current_date)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.borrowings;
  r record;
  v_item jsonb;
  v_cond public.item_condition;
  v_status public.unit_status;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat memproses pengembalian.');
  select * into b from public.borrowings where id = p_id and organization_id = public.auth_org_id() for update;
  if b.id is null then raise exception 'Peminjaman tidak ditemukan.'; end if;
  if b.status <> 'BORROWED' then raise exception 'Hanya peminjaman berstatus BORROWED yang dapat dikembalikan.'; end if;
  if p_return_date < b.borrow_date then raise exception 'Tanggal kembali tidak boleh sebelum tanggal pinjam.'; end if;

  perform set_config('app.via_borrowing', 'on', true);
  perform set_config('app.unit_ref', b.id::text, true);

  for r in
    select bi.id as bi_id, u.* from public.borrowing_items bi
    join public.inventory_units u on u.id = bi.inventory_unit_id
    where bi.borrowing_id = p_id
    for update of u
  loop
    select x into v_item from jsonb_array_elements(p_items) x where (x->>'unit_id')::uuid = r.id limit 1;
    if v_item is null or nullif(v_item->>'condition_after', '') is null then
      raise exception 'Kondisi setelah pinjam wajib diisi untuk unit %.', r.unit_code;
    end if;
    v_cond := (v_item->>'condition_after')::public.item_condition;
    v_status := case v_cond when 'DAMAGED' then 'MAINTENANCE' when 'LOST' then 'LOST' else 'AVAILABLE' end;

    update public.borrowing_items
       set condition_after = v_cond, returned_at = now(), notes = nullif(v_item->>'notes', '')
     where id = r.bi_id;

    perform set_config('app.unit_action', 'Dikembalikan (' || b.borrowing_code || ')', true);
    perform set_config('app.unit_note', coalesce(nullif(v_item->>'notes', ''), 'Inspeksi pengembalian'), true);
    update public.inventory_units set status = v_status, condition = v_cond where id = r.id;

    if v_cond = 'DAMAGED' then
      insert into public.inventory_maintenance (organization_id, inventory_unit_id, borrowing_id, issue, created_by)
      values (b.organization_id, r.id, b.id,
              coalesce(nullif(v_item->>'notes', ''), 'Rusak setelah peminjaman ' || b.borrowing_code), auth.uid());
    end if;
  end loop;

  update public.borrowings set status = 'RETURNED', actual_return_date = p_return_date where id = p_id;
  perform set_config('app.via_borrowing', '', true);
  perform set_config('app.unit_action', '', true);
  perform set_config('app.unit_ref', '', true);
  perform set_config('app.unit_note', '', true);
end $$;

-- ---------------------------------------------------------------------
-- MAINTENANCE & KONDISI UNIT
-- ---------------------------------------------------------------------
create or replace function public.start_maintenance(p_unit uuid, p_issue text)
returns uuid language plpgsql security definer set search_path = public as $$
declare u public.inventory_units; v_id uuid;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat membuat maintenance.');
  select * into u from public.inventory_units where id = p_unit and organization_id = public.auth_org_id() for update;
  if u.id is null then raise exception 'Unit tidak ditemukan.'; end if;
  if u.status in ('BORROWED','LOST') then raise exception 'Unit % sedang %, tidak dapat masuk maintenance.', u.unit_code, u.status; end if;
  if exists (select 1 from public.inventory_maintenance where inventory_unit_id = p_unit and status <> 'DONE') then
    raise exception 'Unit % sudah memiliki maintenance aktif.', u.unit_code;
  end if;
  if coalesce(trim(p_issue), '') = '' then raise exception 'Keterangan kerusakan wajib diisi.'; end if;
  insert into public.inventory_maintenance (organization_id, inventory_unit_id, issue, status, created_by)
  values (u.organization_id, u.id, trim(p_issue), 'IN_PROGRESS', auth.uid()) returning id into v_id;
  perform set_config('app.unit_action', 'Masuk maintenance', true);
  perform set_config('app.unit_ref', v_id::text, true);
  perform set_config('app.unit_note', trim(p_issue), true);
  update public.inventory_units set status = 'MAINTENANCE' where id = u.id;
  perform set_config('app.unit_action', '', true);
  perform set_config('app.unit_ref', '', true);
  perform set_config('app.unit_note', '', true);
  return v_id;
end $$;

create or replace function public.complete_maintenance(
  p_id uuid, p_result public.item_condition, p_cost numeric default null, p_notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare m public.inventory_maintenance;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat menyelesaikan maintenance.');
  select * into m from public.inventory_maintenance where id = p_id and organization_id = public.auth_org_id() for update;
  if m.id is null then raise exception 'Data maintenance tidak ditemukan.'; end if;
  if m.status = 'DONE' then raise exception 'Maintenance sudah selesai.'; end if;
  if p_cost is not null and p_cost < 0 then raise exception 'Biaya tidak boleh negatif.'; end if;
  update public.inventory_maintenance
     set status = 'DONE', completed_at = now(), result_condition = p_result, cost = p_cost,
         notes = coalesce(nullif(p_notes, ''), notes)
   where id = p_id;
  perform set_config('app.unit_action', 'Selesai maintenance', true);
  perform set_config('app.unit_ref', p_id::text, true);
  perform set_config('app.unit_note', coalesce(nullif(p_notes, ''), 'Perbaikan selesai'), true);
  update public.inventory_units
     set condition = p_result,
         status = case p_result when 'DAMAGED' then 'DAMAGED' when 'LOST' then 'LOST' else 'AVAILABLE' end::public.unit_status
   where id = m.inventory_unit_id;
  perform set_config('app.unit_action', '', true);
  perform set_config('app.unit_ref', '', true);
  perform set_config('app.unit_note', '', true);
end $$;

create or replace function public.set_unit_condition(p_unit uuid, p_condition public.item_condition, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare u public.inventory_units;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat mengubah kondisi unit.');
  select * into u from public.inventory_units where id = p_unit and organization_id = public.auth_org_id() for update;
  if u.id is null then raise exception 'Unit tidak ditemukan.'; end if;
  if u.status = 'BORROWED' then raise exception 'Unit % sedang dipinjam. Ubah kondisi saat pengembalian.', u.unit_code; end if;
  perform set_config('app.unit_action', 'Kondisi diperbarui', true);
  perform set_config('app.unit_note', coalesce(p_note, ''), true);
  update public.inventory_units set condition = p_condition,
    status = case
      when p_condition = 'LOST' then 'LOST'
      when p_condition = 'DAMAGED' then 'MAINTENANCE'
      when u.status in ('LOST','DAMAGED') then 'AVAILABLE'
      else u.status end::public.unit_status,
    notes = coalesce(nullif(p_note, ''), notes)
  where id = u.id;
  if p_condition = 'DAMAGED' and not exists (select 1 from public.inventory_maintenance where inventory_unit_id = u.id and status <> 'DONE') then
    insert into public.inventory_maintenance (organization_id, inventory_unit_id, issue, created_by)
    values (u.organization_id, u.id, coalesce(nullif(p_note, ''), 'Ditandai rusak saat pengecekan'), auth.uid());
  end if;
  perform set_config('app.unit_action', '', true);
  perform set_config('app.unit_note', '', true);
end $$;

-- ---------------------------------------------------------------------
-- NOTIFIKASI TERJADWAL (dipanggil saat dashboard dibuka)
-- ---------------------------------------------------------------------
create or replace function public.refresh_notifications()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.auth_org_id();
  r record;
begin
  if v_org is null then return; end if;

  -- Pengembalian jatuh tempo besok / terlambat
  for r in
    select b.id, b.borrowing_code, b.borrower_name, b.expected_return_date,
           string_agg(i.name || ' ' || u.unit_code, ', ' order by u.unit_code) as units
      from public.borrowings b
      join public.borrowing_items bi on bi.borrowing_id = b.id
      join public.inventory_units u on u.id = bi.inventory_unit_id
      join public.inventory_items i on i.id = u.inventory_item_id
     where b.organization_id = v_org and b.status = 'BORROWED' and b.expected_return_date <= current_date + 1
     group by b.id
  loop
    if r.expected_return_date = current_date + 1 then
      perform public.notify_roles(v_org, array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'BORROWING_DUE',
        format('Pengembalian %s jatuh tempo besok.', left(r.units, 120)),
        format('Peminjam: %s (%s).', r.borrower_name, r.borrowing_code),
        '/dashboard/borrowings/' || r.id, 'due:' || r.id || ':' || r.expected_return_date);
    elsif r.expected_return_date < current_date + 1 then
      perform public.notify_roles(v_org, array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'BORROWING_OVERDUE',
        format('Pengembalian %s sudah jatuh tempo.', left(r.units, 120)),
        format('Peminjam: %s (%s), jatuh tempo %s.', r.borrower_name, r.borrowing_code, to_char(r.expected_return_date, 'DD-MM-YYYY')),
        '/dashboard/borrowings/' || r.id, 'overdue:' || r.id || ':' || current_date);
    end if;
  end loop;

  -- Event mendekat (H-7, H-3, H-1)
  for r in
    select e.id, e.name, (e.start_date at time zone 'Asia/Jakarta')::date - (now() at time zone 'Asia/Jakarta')::date as days_left
      from public.events e
     where e.organization_id = v_org and e.status in ('PLANNING','READY')
       and (e.start_date at time zone 'Asia/Jakarta')::date - (now() at time zone 'Asia/Jakarta')::date in (7, 3, 1)
  loop
    perform public.notify_roles(v_org, array['SUPER_ADMIN','PENGURUS','BENDAHARA','PANITIA']::public.app_role[], 'EVENT_SOON',
      format('%s tinggal %s hari.', r.name, r.days_left),
      'Cek quest checklist dan kesiapan inventaris.', '/dashboard/events/' || r.id, 'soon:' || r.id || ':' || r.days_left);
  end loop;

  -- Budget event >= 80%
  for r in
    select s.event_id, s.name, s.budget_used_pct from public.event_finance_summary s
      join public.events e on e.id = s.event_id
     where s.organization_id = v_org and s.budget > 0 and s.budget_used_pct >= 80
       and e.status not in ('COMPLETED','CANCELLED')
  loop
    perform public.notify_roles(v_org, array['SUPER_ADMIN','PENGURUS','BENDAHARA']::public.app_role[], 'BUDGET_ALERT',
      format('Budget event %s sudah mencapai %s%%.', r.name, round(r.budget_used_pct)),
      'Tinjau pengeluaran sebelum menambah belanja baru.', '/dashboard/events/' || r.event_id || '?tab=finance',
      'budget80:' || r.event_id);
  end loop;

  -- Transaksi menunggu persetujuan
  if exists (select 1 from public.finance_transactions where organization_id = v_org and not is_approved) then
    perform public.notify_roles(v_org, array['SUPER_ADMIN','BENDAHARA']::public.app_role[], 'FINANCE_PENDING',
      'Ada transaksi yang menunggu persetujuan.',
      format('%s transaksi belum disetujui.', (select count(*) from public.finance_transactions where organization_id = v_org and not is_approved)),
      '/dashboard/finance/transactions?status=pending', 'fin-pending:' || current_date);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- ACHIEVEMENTS
-- ---------------------------------------------------------------------
create or replace function public.org_metrics(p_org uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'inventory_items', (select count(*) from public.inventory_items where organization_id = p_org and not is_archived),
    'inventory_units', (select count(*) from public.inventory_units where organization_id = p_org and status <> 'LOST'),
    'events_completed', (select count(*) from public.events where organization_id = p_org and kind = 'EVENT' and status = 'COMPLETED'),
    'activities_completed', (select count(*) from public.events where organization_id = p_org and status = 'COMPLETED'),
    'transactions', (select count(*) from public.finance_transactions where organization_id = p_org and is_approved),
    'members_active', (select count(*) from public.members where organization_id = p_org and status = 'ACTIVE'),
    'documents', (select count(*) from public.documents where organization_id = p_org),
    'tasks_done', (select count(*) from public.event_tasks where organization_id = p_org and is_done),
    'borrowings_returned', (select count(*) from public.borrowings where organization_id = p_org and status = 'RETURNED')
  )
$$;

create or replace function public.refresh_achievements(p_org uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := coalesce(p_org, public.auth_org_id());
  v_metrics jsonb;
begin
  if v_org is null then return; end if;
  if auth.uid() is not null and v_org <> public.auth_org_id() then
    raise exception using errcode = '42501', message = 'Akses ditolak.';
  end if;
  v_metrics := public.org_metrics(v_org);
  insert into public.organization_achievements (organization_id, achievement_id, progress, unlocked_at)
  select v_org, a.id, coalesce((v_metrics->>a.metric)::integer, 0),
         case when coalesce((v_metrics->>a.metric)::integer, 0) >= a.threshold then now() end
    from public.achievements a
  on conflict (organization_id, achievement_id) do update
    set progress = excluded.progress,
        unlocked_at = coalesce(public.organization_achievements.unlocked_at, excluded.unlocked_at);
end $$;
