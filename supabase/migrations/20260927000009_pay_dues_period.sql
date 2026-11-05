-- Tandai lunas satu bulan tertentu (dipakai dari kartu iuran setahun).
-- Berbeda dari record_dues_payment yang mengalokasikan ke tunggakan tertua,
-- fungsi ini membayar tepat bulan yang dipilih. Tagihan dibuat bila belum ada.
create or replace function public.pay_dues_period(
  p_household uuid, p_period date, p_paid_at date, p_account uuid, p_method public.payment_method default 'CASH'
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.auth_org_id();
  h public.households;
  b public.dues_bills;
  v_period date := date_trunc('month', p_period)::date;
  v_amount numeric;
  v_cat uuid;
  v_tx uuid;
  v_pay uuid;
begin
  perform public.require_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[], 'Hanya Bendahara atau Super Admin yang dapat mencatat pembayaran iuran.');
  select * into h from public.households where id = p_household and organization_id = v_org for update;
  if h.id is null then raise exception 'Tagihan tidak ditemukan.'; end if;

  insert into public.dues_bills (organization_id, household_id, period, amount_due)
  values (v_org, h.id, v_period, h.monthly_fee)
  on conflict (household_id, period) do nothing;
  select * into b from public.dues_bills where household_id = h.id and period = v_period for update;

  if b.status = 'WAIVED' then raise exception 'Tagihan bulan ini dibebaskan. Batalkan pembebasan dulu bila ingin menagih.'; end if;
  v_amount := b.amount_due - b.amount_paid;
  if v_amount <= 0 then raise exception 'Tagihan % bulan % sudah lunas.', h.name, to_char(v_period, 'MM/YYYY'); end if;

  insert into public.finance_categories (organization_id, name, type, color)
  values (v_org, 'Iuran Anggota', 'INCOME', '#3E9B4F')
  on conflict (organization_id, type, name) do update set is_active = true
  returning id into v_cat;

  insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description,
    account_id, payment_method, is_approved, is_public)
  values (v_org, p_paid_at, 'INCOME', v_cat, v_amount, left('Iuran ' || h.name || ' · ' || to_char(v_period, 'MM/YYYY'), 500),
    p_account, p_method, true, false)
  returning id into v_tx;

  insert into public.dues_payments (organization_id, household_id, paid_at, amount, payment_method, account_id,
    finance_transaction_id, note, recorded_by)
  values (v_org, h.id, p_paid_at, v_amount, p_method, p_account, v_tx, 'Ditandai dari kartu iuran', auth.uid())
  returning id into v_pay;

  insert into public.dues_allocations (payment_id, bill_id, organization_id, amount) values (v_pay, b.id, v_org, v_amount);
  return v_pay;
end $$;

revoke execute on function public.pay_dues_period(uuid, date, date, uuid, public.payment_method) from public, anon;
grant execute on function public.pay_dues_period(uuid, date, date, uuid, public.payment_method) to authenticated;
