-- =====================================================================
-- Seed iuran per tagihan (rumah) & arisan tuan rumah rapat — Pemuda RW 05
-- Jalankan setelah seed.sql dan migration 0007.
-- =====================================================================
do $seed$
declare
  v_org uuid := '0b05a5e0-0000-4000-8000-000000000005';
  d date := current_date;
  m0 date := date_trunc('month', current_date)::date;
  v_tunai uuid;
  v_cat uuid;
  v_house uuid;
  v_bill uuid;
  v_tx uuid;
  v_pay uuid;
  g record;
  m record;
  i integer := 0;
  v_amount numeric;
  v_houses uuid[];
  v_fee numeric;
begin
  if exists (select 1 from public.households where organization_id = v_org) then
    raise notice 'Seed iuran sudah ada, dilewati.';
    return;
  end if;
  select id into v_tunai from public.finance_accounts where organization_id = v_org and name = 'Kas Tunai';
  select id into v_cat from public.finance_categories where organization_id = v_org and type = 'INCOME' and name = 'Iuran Anggota';

  -- Rumah kakak-adik
  for g in select * from (values
    ('Keluarga Hidayat (Rahmat, Wahyu, Nurul)', array['Rahmat Hidayat','Wahyu Hidayat','Nurul Hidayah'], 20000, 'Kwarasan RT 03/RW 05'),
    ('Keluarga Setiawan (Bagas & Oki)', array['Bagas Setiawan','Oki Setiawan'], 15000, 'Kwarasan RT 02/RW 05'),
    ('Keluarga Wijaya (Satria & Hendra)', array['Satria Wijaya','Hendra Wijaya'], 15000, 'Kwarasan RT 05/RW 05'),
    ('Keluarga Nugroho (Fajar & Mahendra)', array['Fajar Nugroho','Mahendra Adi Nugroho'], 15000, 'Kwarasan RT 01/RW 05')
  ) as t(name, members, fee, address) loop
    insert into public.households (organization_id, name, monthly_fee, address, notes)
    values (v_org, g.name, g.fee, g.address, 'Kakak-adik serumah dalam satu tagihan')
    returning id into v_house;
    insert into public.household_members (member_id, household_id, organization_id)
    select id, v_house, v_org from public.members where organization_id = v_org and name = any(g.members);
  end loop;

  -- Anggota aktif lain: satu tagihan per orang
  for m in
    select mb.id, mb.name from public.members mb
     where mb.organization_id = v_org and mb.status = 'ACTIVE'
       and not exists (select 1 from public.household_members hm where hm.member_id = mb.id)
     order by mb.name
  loop
    insert into public.households (organization_id, name, monthly_fee) values (v_org, m.name, 10000) returning id into v_house;
    insert into public.household_members (member_id, household_id, organization_id) values (m.id, v_house, v_org);
  end loop;

  -- Tagihan bulan ini
  insert into public.dues_bills (organization_id, household_id, period, amount_due)
  select v_org, id, m0, monthly_fee from public.households where organization_id = v_org and is_active;

  -- Transaksi iuran gabungan bulan ini diganti pembayaran per tagihan (riwayat lebih rinci).
  delete from public.finance_transactions
   where organization_id = v_org and category_id = v_cat and transaction_date >= m0 and description like 'Iuran anggota bulan%';

  select array_agg(id order by name) into v_houses from public.households where organization_id = v_org;
  foreach v_house in array v_houses loop
    i := i + 1;
    select monthly_fee into v_fee from public.households where id = v_house;
    -- 30 rumah lunas, 3 bayar sebagian, sisanya belum; 1 rumah bayar di muka 2 bulan.
    v_amount := case when i = 1 then v_fee * 2 when i <= 30 then v_fee when i <= 33 then 5000 else 0 end;
    continue when v_amount = 0;
    insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
    values (v_org, least(d, m0 + (i % 10)), 'INCOME', v_cat, v_amount,
      'Iuran ' || (select name from public.households where id = v_house) || ' · ' || to_char(m0, 'MM/YYYY') || case when i = 1 then ', ' || to_char(m0 + interval '1 month', 'MM/YYYY') else '' end,
      v_tunai, 'CASH', true, false)
    returning id into v_tx;
    insert into public.dues_payments (organization_id, household_id, paid_at, amount, payment_method, account_id, finance_transaction_id)
    values (v_org, v_house, least(d, m0 + (i % 10)), v_amount, 'CASH', v_tunai, v_tx)
    returning id into v_pay;
    select id into v_bill from public.dues_bills where household_id = v_house and period = m0;
    insert into public.dues_allocations (payment_id, bill_id, organization_id, amount) values (v_pay, v_bill, v_org, least(v_amount, v_fee));
    if v_amount > v_fee then
      insert into public.dues_bills (organization_id, household_id, period, amount_due)
      values (v_org, v_house, (m0 + interval '1 month')::date, v_fee) returning id into v_bill;
      insert into public.dues_allocations (payment_id, bill_id, organization_id, amount) values (v_pay, v_bill, v_org, v_amount - v_fee);
    end if;
  end loop;

  -- Arisan tuan rumah rapat tahun ini (rapat rutin tiap bulan)
  i := 0;
  for g in
    select id from public.households where organization_id = v_org order by md5(id::text) limit greatest(extract(month from d)::int - 1, 1)
  loop
    i := i + 1;
    insert into public.host_draws (organization_id, year, household_id, meeting_date, method, created_at)
    values (v_org, extract(year from d)::int, g.id,
      (make_date(extract(year from d)::int, i, 1) + 13)::date, 'RANDOM',
      (make_date(extract(year from d)::int, i, 1) + 1)::timestamptz);
  end loop;

  delete from public.audit_logs where organization_id = v_org and entity in ('households','dues_payments','host_draws','finance_transactions') and created_at > now() - interval '5 minutes';
end
$seed$;
