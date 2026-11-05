-- =====================================================================
-- BASECAMP PEMUDA RW 05 — Iuran bulanan per tagihan (rumah) & arisan tuan rumah rapat
-- =====================================================================

create type public.dues_status as enum ('UNPAID', 'PARTIAL', 'PAID', 'WAIVED');

-- Tagihan / rumah: satu anggota, atau kakak-adik serumah dalam satu tagihan.
create table public.households (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  address text,
  monthly_fee numeric(14,2) not null default 10000 check (monthly_fee >= 0),
  is_active boolean not null default true,
  host_eligible boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint households_name_uq unique (organization_id, name)
);

create table public.household_members (
  member_id uuid primary key references public.members(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index household_members_household_idx on public.household_members (household_id);

create table public.dues_bills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  period date not null check (extract(day from period) = 1),
  amount_due numeric(14,2) not null check (amount_due >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  status public.dues_status not null default 'UNPAID',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dues_bills_uq unique (household_id, period)
);
create index dues_bills_org_period_idx on public.dues_bills (organization_id, period);

create table public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  paid_at date not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'CASH',
  account_id uuid references public.finance_accounts(id) on delete restrict,
  finance_transaction_id uuid references public.finance_transactions(id) on delete set null,
  note text,
  cancelled_at timestamptz,
  cancel_reason text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dues_payments_household_idx on public.dues_payments (household_id, paid_at desc);

create table public.dues_allocations (
  payment_id uuid not null references public.dues_payments(id) on delete cascade,
  bill_id uuid not null references public.dues_bills(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  primary key (payment_id, bill_id)
);
create index dues_allocations_bill_idx on public.dues_allocations (bill_id);

-- Arisan tuan rumah rapat: satu rumah maksimal sekali per tahun.
create table public.host_draws (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  household_id uuid not null references public.households(id) on delete cascade,
  meeting_date date,
  event_id uuid references public.events(id) on delete set null,
  method text not null default 'RANDOM' check (method in ('RANDOM', 'MANUAL')),
  note text,
  drawn_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint host_draws_once_per_year unique (organization_id, year, household_id)
);
create index host_draws_org_year_idx on public.host_draws (organization_id, year, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['households','dues_bills','dues_payments'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

create trigger audit_households after insert or update or delete on public.households
  for each row execute function public.audit_trigger('tagihan', 'name');
create trigger audit_dues_payments after insert or update on public.dues_payments
  for each row execute function public.audit_trigger('pembayaran iuran', 'id');
create trigger audit_host_draws after insert or delete on public.host_draws
  for each row execute function public.audit_trigger('tuan rumah rapat', 'year');

-- Status tagihan dihitung dari alokasi pembayaran (tidak diketik manual).
create or replace function public.refresh_bill(p_bill uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_paid numeric;
begin
  select coalesce(sum(a.amount), 0) into v_paid
    from public.dues_allocations a join public.dues_payments p on p.id = a.payment_id
   where a.bill_id = p_bill and p.cancelled_at is null;
  update public.dues_bills set
    amount_paid = v_paid,
    status = case
      when status = 'WAIVED' then 'WAIVED'
      when v_paid >= amount_due and amount_due > 0 then 'PAID'
      when v_paid > 0 then 'PARTIAL'
      else 'UNPAID' end::public.dues_status
  where id = p_bill;
end $$;

create or replace function public.dues_alloc_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_bill(coalesce(new.bill_id, old.bill_id));
  return null;
end $$;
create trigger dues_allocations_after_write after insert or update or delete on public.dues_allocations
for each row execute function public.dues_alloc_after_write();

-- Buat tagihan bulan tertentu untuk semua rumah aktif (nominal di-snapshot).
create or replace function public.generate_dues_bills(p_period date)
returns integer language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.auth_org_id(); v_n integer;
begin
  perform public.require_role(array['SUPER_ADMIN','BENDAHARA','PENGURUS']::public.app_role[], 'Hanya pengurus/bendahara yang dapat membuat tagihan.');
  if v_org is null then raise exception 'Akun belum terhubung ke organisasi.'; end if;
  insert into public.dues_bills (organization_id, household_id, period, amount_due)
  select v_org, h.id, date_trunc('month', p_period)::date, h.monthly_fee
    from public.households h
   where h.organization_id = v_org and h.is_active and h.monthly_fee > 0
  on conflict (household_id, period) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Catat pembayaran iuran: masuk kas (transaksi approved) lalu dialokasikan ke tagihan
-- tertua yang belum lunas; kelebihan otomatis menjadi bayar di muka bulan berikutnya.
create or replace function public.record_dues_payment(
  p_household uuid, p_amount numeric, p_paid_at date, p_account uuid,
  p_method public.payment_method default 'CASH', p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.auth_org_id();
  h public.households;
  v_cat uuid;
  v_tx uuid;
  v_pay uuid;
  v_left numeric := p_amount;
  v_take numeric;
  b record;
  v_next date;
  v_bill uuid;
  v_periods text[] := array[]::text[];
  v_guard integer := 0;
begin
  perform public.require_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[], 'Hanya Bendahara atau Super Admin yang dapat mencatat pembayaran iuran.');
  if p_amount is null or p_amount <= 0 then raise exception 'Nominal pembayaran harus lebih dari 0.'; end if;
  select * into h from public.households where id = p_household and organization_id = v_org for update;
  if h.id is null then raise exception 'Tagihan tidak ditemukan.'; end if;

  insert into public.finance_categories (organization_id, name, type, color)
  values (v_org, 'Iuran Anggota', 'INCOME', '#3E9B4F')
  on conflict (organization_id, type, name) do update set is_active = true
  returning id into v_cat;

  insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description,
    account_id, payment_method, is_approved, is_public)
  values (v_org, p_paid_at, 'INCOME', v_cat, p_amount, 'Iuran ' || h.name, p_account, p_method, true, false)
  returning id into v_tx;

  insert into public.dues_payments (organization_id, household_id, paid_at, amount, payment_method, account_id,
    finance_transaction_id, note, recorded_by)
  values (v_org, h.id, p_paid_at, p_amount, p_method, p_account, v_tx, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_pay;

  -- 1) lunasi tunggakan tertua
  for b in
    select id, period, amount_due - amount_paid as sisa from public.dues_bills
     where household_id = h.id and status in ('UNPAID','PARTIAL') and amount_due > amount_paid
     order by period
     for update
  loop
    exit when v_left <= 0;
    v_take := least(v_left, b.sisa);
    insert into public.dues_allocations (payment_id, bill_id, organization_id, amount) values (v_pay, b.id, v_org, v_take);
    v_left := v_left - v_take;
    v_periods := v_periods || to_char(b.period, 'MM/YYYY');
  end loop;

  -- 2) kelebihan = bayar di muka
  if v_left > 0 then
    if h.monthly_fee <= 0 then raise exception 'Nominal iuran tagihan ini 0, kelebihan pembayaran tidak bisa dialokasikan.'; end if;
    select greatest(coalesce(max(period) + interval '1 month', date_trunc('month', p_paid_at)), date_trunc('month', p_paid_at))::date
      into v_next from public.dues_bills where household_id = h.id;
    while v_left > 0 loop
      v_guard := v_guard + 1;
      if v_guard > 36 then raise exception 'Pembayaran di muka maksimal 36 bulan.'; end if;
      insert into public.dues_bills (organization_id, household_id, period, amount_due)
      values (v_org, h.id, v_next, h.monthly_fee)
      on conflict (household_id, period) do update set amount_due = public.dues_bills.amount_due
      returning id into v_bill;
      v_take := least(v_left, h.monthly_fee);
      insert into public.dues_allocations (payment_id, bill_id, organization_id, amount) values (v_pay, v_bill, v_org, v_take);
      v_left := v_left - v_take;
      v_periods := v_periods || to_char(v_next, 'MM/YYYY');
      v_next := (v_next + interval '1 month')::date;
    end loop;
  end if;

  update public.finance_transactions
     set description = left('Iuran ' || h.name || ' · ' || array_to_string(v_periods, ', '), 500)
   where id = v_tx;
  return v_pay;
end $$;

-- Batalkan pembayaran salah catat: kas dikoreksi lewat reversal (riwayat tetap utuh).
create or replace function public.cancel_dues_payment(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.dues_payments; a record;
begin
  perform public.require_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[], 'Hanya Bendahara atau Super Admin yang dapat membatalkan pembayaran.');
  if coalesce(trim(p_reason), '') = '' then raise exception 'Alasan pembatalan wajib diisi.'; end if;
  select * into p from public.dues_payments where id = p_payment and organization_id = public.auth_org_id() for update;
  if p.id is null then raise exception 'Pembayaran tidak ditemukan.'; end if;
  if p.cancelled_at is not null then raise exception 'Pembayaran ini sudah dibatalkan.'; end if;
  update public.dues_payments set cancelled_at = now(), cancel_reason = trim(p_reason) where id = p.id;
  for a in select bill_id from public.dues_allocations where payment_id = p.id loop
    perform public.refresh_bill(a.bill_id);
  end loop;
  if p.finance_transaction_id is not null
     and not exists (select 1 from public.finance_transactions where reversal_of = p.finance_transaction_id) then
    perform public.reverse_transaction(p.finance_transaction_id, 'Batal iuran: ' || trim(p_reason));
  end if;
end $$;

create or replace function public.set_bill_waived(p_bill uuid, p_waived boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b public.dues_bills;
begin
  perform public.require_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[], 'Hanya Bendahara atau Super Admin yang dapat membebaskan tagihan.');
  select * into b from public.dues_bills where id = p_bill and organization_id = public.auth_org_id() for update;
  if b.id is null then raise exception 'Tagihan tidak ditemukan.'; end if;
  if p_waived and b.amount_paid > 0 then raise exception 'Tagihan yang sudah dibayar sebagian tidak bisa dibebaskan.'; end if;
  update public.dues_bills set status = case when p_waived then 'WAIVED' else 'UNPAID' end::public.dues_status,
    notes = coalesce(nullif(trim(coalesce(p_note, '')), ''), notes)
   where id = p_bill;
  if not p_waived then perform public.refresh_bill(p_bill); end if;
end $$;

-- Kocok tuan rumah rapat: acak dari rumah yang belum pernah ketempatan tahun ini.
create or replace function public.draw_meeting_host(p_year integer, p_meeting_date date default null, p_event uuid default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.auth_org_id(); v_house uuid; v_id uuid;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat mengocok tuan rumah rapat.');
  perform pg_advisory_xact_lock(hashtext('host-draw:' || v_org || ':' || p_year));
  select h.id into v_house from public.households h
   where h.organization_id = v_org and h.is_active and h.host_eligible
     and not exists (select 1 from public.host_draws d where d.household_id = h.id and d.year = p_year and d.organization_id = v_org)
   order by random() limit 1;
  if v_house is null then
    raise exception 'Semua rumah sudah pernah jadi tuan rumah rapat tahun %. Kocokan tahun depan dimulai dari awal lagi.', p_year;
  end if;
  insert into public.host_draws (organization_id, year, household_id, meeting_date, event_id, method, note, drawn_by)
  values (v_org, p_year, v_house, p_meeting_date, p_event, 'RANDOM', nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.set_meeting_host(p_year integer, p_household uuid, p_meeting_date date default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.auth_org_id(); v_id uuid;
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat menetapkan tuan rumah rapat.');
  if not exists (select 1 from public.households where id = p_household and organization_id = v_org and is_active) then
    raise exception 'Rumah tidak ditemukan atau nonaktif.';
  end if;
  if exists (select 1 from public.host_draws where organization_id = v_org and year = p_year and household_id = p_household) then
    raise exception 'Rumah ini sudah pernah jadi tuan rumah rapat tahun %.', p_year;
  end if;
  insert into public.host_draws (organization_id, year, household_id, meeting_date, method, note, drawn_by)
  values (v_org, p_year, p_household, p_meeting_date, 'MANUAL', nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.undo_meeting_host(p_draw uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[], 'Hanya pengurus yang dapat membatalkan hasil kocokan.');
  delete from public.host_draws where id = p_draw and organization_id = public.auth_org_id();
  if not found then raise exception 'Data kocokan tidak ditemukan.'; end if;
end $$;

-- Buku kas: mutasi akun dengan saldo berjalan.
create or replace function public.account_ledger(p_account uuid, p_from date, p_to date)
returns table (transaction_id uuid, transaction_date date, transaction_code text, description text, category text,
               debit numeric, credit numeric, balance numeric, opening numeric)
language sql stable security definer set search_path = public as $$
  with acc as (
    select a.id from public.finance_accounts a
     where a.id = p_account and a.organization_id = public.auth_org_id()
       and public.has_role(array['SUPER_ADMIN','PENGURUS','BENDAHARA']::public.app_role[])
  ),
  moves as (
    select t.id, t.transaction_date, t.transaction_code, t.created_at,
           coalesce(t.description, c.name, 'Transfer') as description,
           case when t.type = 'TRANSFER' then case when t.to_account_id = acc.id then 'Transfer masuk' else 'Transfer keluar' end else c.name end as category,
           case when (t.type = 'INCOME' and t.account_id = acc.id) or (t.type = 'TRANSFER' and t.to_account_id = acc.id) then t.amount else 0 end as debit,
           case when (t.type in ('EXPENSE','TRANSFER') and t.account_id = acc.id) then t.amount else 0 end as credit
      from public.finance_transactions t
      join acc on (t.account_id = acc.id or t.to_account_id = acc.id)
      left join public.finance_categories c on c.id = t.category_id
     where t.is_approved
  ),
  opening as (select coalesce(sum(debit - credit), 0) as v from moves where transaction_date < p_from)
  select m.id, m.transaction_date, m.transaction_code, m.description, m.category, m.debit, m.credit,
         (o.v + sum(m.debit - m.credit) over (order by m.transaction_date, m.created_at, m.id))::numeric(14,2),
         o.v::numeric(14,2)
    from moves m cross join opening o
   where m.transaction_date between p_from and p_to
   order by m.transaction_date, m.created_at, m.id
$$;

-- ------------------------------ RLS ----------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.dues_bills enable row level security;
alter table public.dues_payments enable row level security;
alter table public.dues_allocations enable row level security;
alter table public.host_draws enable row level security;

create or replace function public.my_household()
returns uuid language sql stable security definer set search_path = public as $$
  select hm.household_id from public.household_members hm join public.profiles p on p.member_id = hm.member_id where p.id = auth.uid()
$$;

create policy households_read on public.households for select to authenticated using (organization_id = public.auth_org_id());
create policy households_write on public.households for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA','PENGURUS']::public.app_role[]));

create policy household_members_read on public.household_members for select to authenticated using (organization_id = public.auth_org_id());
create policy household_members_write on public.household_members for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA','PENGURUS']::public.app_role[]));

-- Status iuran: pengurus inti melihat semua; anggota hanya tagihan rumahnya sendiri.
create policy dues_bills_read on public.dues_bills for select to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','BENDAHARA','PENGURUS']::public.app_role[]) or household_id = public.my_household()));
create policy dues_payments_read on public.dues_payments for select to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','BENDAHARA','PENGURUS']::public.app_role[]) or household_id = public.my_household()));
create policy dues_allocations_read on public.dues_allocations for select to authenticated
  using (organization_id = public.auth_org_id() and exists (select 1 from public.dues_payments p where p.id = payment_id));

create policy host_draws_read on public.host_draws for select to authenticated using (organization_id = public.auth_org_id());

revoke insert, update, delete on public.dues_bills, public.dues_payments, public.dues_allocations, public.host_draws from anon, authenticated;
grant update (notes) on public.dues_bills to authenticated;
create policy dues_bills_note on public.dues_bills for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[]))
  with check (organization_id = public.auth_org_id());
revoke all on public.households, public.household_members from anon;

revoke execute on function public.refresh_bill(uuid), public.dues_alloc_after_write() from public, anon, authenticated;
grant execute on function public.dues_alloc_after_write() to authenticated;
grant execute on function
  public.generate_dues_bills(date),
  public.record_dues_payment(uuid, numeric, date, uuid, public.payment_method, text),
  public.cancel_dues_payment(uuid, text),
  public.set_bill_waived(uuid, boolean, text),
  public.draw_meeting_host(integer, date, uuid, text),
  public.set_meeting_host(integer, uuid, date, text),
  public.undo_meeting_host(uuid),
  public.account_ledger(uuid, date, date),
  public.my_household()
to authenticated;
revoke execute on function public.generate_dues_bills(date), public.record_dues_payment(uuid, numeric, date, uuid, public.payment_method, text),
  public.cancel_dues_payment(uuid, text), public.set_bill_waived(uuid, boolean, text), public.draw_meeting_host(integer, date, uuid, text),
  public.set_meeting_host(integer, uuid, date, text), public.undo_meeting_host(uuid), public.account_ledger(uuid, date, date), public.my_household()
from anon, public;
