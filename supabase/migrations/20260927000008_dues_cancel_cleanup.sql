-- Saat pembayaran di muka dibatalkan, tagihan bulan-bulan mendatang yang
-- dibuat otomatis dan kini kosong ikut dihapus agar tidak tampil sebagai tunggakan.
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
  delete from public.dues_bills b
   where b.household_id = p.household_id
     and b.period > date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date
     and b.amount_paid = 0 and b.status = 'UNPAID'
     and not exists (
       select 1 from public.dues_allocations x join public.dues_payments y on y.id = x.payment_id
        where x.bill_id = b.id and y.cancelled_at is null);
  if p.finance_transaction_id is not null
     and not exists (select 1 from public.finance_transactions where reversal_of = p.finance_transaction_id) then
    perform public.reverse_transaction(p.finance_transaction_id, 'Batal iuran: ' || trim(p_reason));
  end if;
end $$;

-- Bersihkan tagihan masa depan kosong yang tertinggal dari pembatalan sebelumnya.
delete from public.dues_bills b
 where b.period > date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date
   and b.amount_paid = 0 and b.status = 'UNPAID'
   and not exists (
     select 1 from public.dues_allocations x join public.dues_payments y on y.id = x.payment_id
      where x.bill_id = b.id and y.cancelled_at is null);
