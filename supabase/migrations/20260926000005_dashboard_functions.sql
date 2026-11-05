-- =====================================================================
-- BASECAMP PEMUDA RW 05 — Fungsi agregat dashboard (anggota organisasi)
-- =====================================================================

-- Arus kas akun non-event, dikelompokkan per hari/minggu/bulan.
create or replace function public.org_cashflow(p_days integer, p_bucket text default 'day')
returns table (bucket date, income numeric, expense numeric)
language sql stable security definer set search_path = public as $$
  with params as (
    select public.auth_org_id() as org,
           (now() at time zone 'Asia/Jakarta')::date as today,
           greatest(least(p_days, 730), 1) as days,
           case when p_bucket in ('day','week','month') then p_bucket else 'day' end as b
  ),
  series as (
    select generate_series(
      date_trunc(p.b, (p.today - (p.days - 1))::timestamp)::date,
      date_trunc(p.b, p.today::timestamp)::date,
      ('1 ' || p.b)::interval)::date as bucket
    from params p
  ),
  tx as (
    select date_trunc(p.b, t.transaction_date::timestamp)::date as bucket, t.type, t.amount
      from public.finance_transactions t
      join public.finance_accounts a on a.id = t.account_id and a.type <> 'EVENT'
      cross join params p
     where p.org is not null and t.organization_id = p.org and t.is_approved and t.type in ('INCOME','EXPENSE')
       and t.transaction_date >= p.today - (p.days - 1) and t.transaction_date <= p.today
  )
  select s.bucket,
         coalesce(sum(tx.amount) filter (where tx.type = 'INCOME'), 0)::numeric(14,2),
         coalesce(sum(tx.amount) filter (where tx.type = 'EXPENSE'), 0)::numeric(14,2)
    from series s left join tx on tx.bucket = s.bucket
   group by s.bucket order by s.bucket
$$;

-- Ringkasan per kategori untuk laporan (hanya peran keuangan).
create or replace function public.finance_category_summary(p_from date, p_to date, p_event uuid default null)
returns table (category_id uuid, category text, type public.finance_type, color text, total numeric, count bigint)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.has_role(array['SUPER_ADMIN','PENGURUS','BENDAHARA']::public.app_role[]) then
    raise exception using errcode = '42501', message = 'Laporan keuangan hanya untuk pengurus inti.';
  end if;
  return query
  select c.id, c.name, t.type, c.color, sum(t.amount)::numeric(14,2), count(*)
    from public.finance_transactions t
    join public.finance_categories c on c.id = t.category_id
   where t.organization_id = public.auth_org_id() and t.is_approved and t.type in ('INCOME','EXPENSE')
     and t.transaction_date between p_from and p_to
     and (p_event is null or t.event_id = p_event)
   group by c.id, c.name, t.type, c.color
   order by t.type, sum(t.amount) desc;
end $$;

grant execute on function public.org_cashflow(integer, text), public.finance_category_summary(date, date, uuid) to authenticated;
