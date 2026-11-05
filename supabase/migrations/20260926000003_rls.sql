-- =====================================================================
-- BASECAMP PEMUDA RW 05 — Row Level Security
-- Prinsip: user hanya membaca data organisasinya; publik hanya membaca
-- data yang ditandai public atau agregat melalui fungsi khusus.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','members','member_private','profiles','events','event_members','event_tasks','event_schedules',
    'finance_accounts','finance_categories','finance_transactions','inventory_categories','inventory_items',
    'inventory_units','inventory_unit_history','borrowings','borrowing_items','inventory_maintenance','documents',
    'notifications','achievements','organization_achievements','audit_logs','org_counters'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Singkatan array peran
-- A = SUPER_ADMIN, P = PENGURUS, B = BENDAHARA, T = PANITIA, G = ANGGOTA

-- ORGANIZATIONS -------------------------------------------------------
create policy org_public_read on public.organizations for select to anon, authenticated using (true);
create policy org_admin_update on public.organizations for update to authenticated
  using (id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN']::public.app_role[]))
  with check (id = public.auth_org_id());

-- PROFILES ------------------------------------------------------------
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or (organization_id is not null and organization_id = public.auth_org_id()));
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN']::public.app_role[])))
  with check (id = auth.uid() or organization_id = public.auth_org_id());

-- MEMBERS -------------------------------------------------------------
create policy members_read on public.members for select to authenticated
  using (organization_id = public.auth_org_id());
create policy members_write on public.members for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]));

create policy member_private_read on public.member_private for select to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[])
    or member_id = (select member_id from public.profiles where id = auth.uid())
  ));
create policy member_private_write on public.member_private for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]));

-- EVENTS --------------------------------------------------------------
create policy events_public_read on public.events for select to anon
  using (is_public and status <> 'DRAFT');
create policy events_member_read on public.events for select to authenticated
  using (organization_id = public.auth_org_id() or (is_public and status <> 'DRAFT'));
create policy events_insert on public.events for insert to authenticated
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]));
create policy events_update on public.events for update to authenticated
  using (organization_id = public.auth_org_id() and public.can_manage_event(id))
  with check (organization_id = public.auth_org_id());
create policy events_delete on public.events for delete to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN']::public.app_role[]));

create policy event_members_read on public.event_members for select to authenticated
  using (organization_id = public.auth_org_id());
create policy event_members_write on public.event_members for all to authenticated
  using (organization_id = public.auth_org_id() and public.can_manage_event(event_id))
  with check (organization_id = public.auth_org_id() and public.can_manage_event(event_id));

create policy event_tasks_read on public.event_tasks for select to authenticated
  using (organization_id = public.auth_org_id());
create policy event_tasks_write on public.event_tasks for all to authenticated
  using (organization_id = public.auth_org_id() and public.can_manage_event(event_id))
  with check (organization_id = public.auth_org_id() and public.can_manage_event(event_id));

create policy event_schedules_public_read on public.event_schedules for select to anon
  using (exists (select 1 from public.events e where e.id = event_id and e.is_public and e.status <> 'DRAFT'));
create policy event_schedules_read on public.event_schedules for select to authenticated
  using (organization_id = public.auth_org_id()
         or exists (select 1 from public.events e where e.id = event_id and e.is_public and e.status <> 'DRAFT'));
create policy event_schedules_write on public.event_schedules for all to authenticated
  using (organization_id = public.auth_org_id() and public.can_manage_event(event_id))
  with check (organization_id = public.auth_org_id() and public.can_manage_event(event_id));

-- FINANCE -------------------------------------------------------------
create policy finance_accounts_read on public.finance_accounts for select to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','PENGURUS','BENDAHARA']::public.app_role[])
    or (event_id is not null and public.is_event_panitia(event_id))
  ));
create policy finance_accounts_write on public.finance_accounts for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[]))
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[]));

create policy finance_categories_read on public.finance_categories for select to authenticated
  using (organization_id = public.auth_org_id());
create policy finance_categories_write on public.finance_categories for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[]))
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[]));

create policy finance_tx_read on public.finance_transactions for select to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','PENGURUS','BENDAHARA']::public.app_role[])
    or (event_id is not null and public.is_event_panitia(event_id))
    or (is_public and is_approved)
    or created_by = auth.uid()
  ));
-- Pengurus & panitia boleh mengajukan transaksi (belum approved); Bendahara/Super Admin approve.
create policy finance_tx_insert on public.finance_transactions for insert to authenticated
  with check (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[])
    or (public.has_role(array['PENGURUS']::public.app_role[]) and not is_approved)
    or (event_id is not null and public.is_event_panitia(event_id) and not is_approved)
  ));
create policy finance_tx_update on public.finance_transactions for update to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[])
    or (created_by = auth.uid() and not is_approved)
  ))
  with check (organization_id = public.auth_org_id());
create policy finance_tx_delete on public.finance_transactions for delete to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','BENDAHARA']::public.app_role[])
    or (created_by = auth.uid() and not is_approved)
  ));

-- INVENTORY -----------------------------------------------------------
create policy inventory_categories_read on public.inventory_categories for select to authenticated
  using (organization_id = public.auth_org_id());
create policy inventory_categories_write on public.inventory_categories for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]));

create policy inventory_items_read on public.inventory_items for select to authenticated
  using (organization_id = public.auth_org_id());
create policy inventory_items_write on public.inventory_items for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]));

create policy inventory_units_read on public.inventory_units for select to authenticated
  using (organization_id = public.auth_org_id());
-- Insert unit lewat fungsi create_inventory_units; update kondisi lewat fungsi. Edit catatan boleh langsung.
create policy inventory_units_update on public.inventory_units for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id());
create policy inventory_units_delete on public.inventory_units for delete to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN']::public.app_role[])
         and not exists (select 1 from public.borrowing_items bi where bi.inventory_unit_id = id));

create policy inventory_unit_history_read on public.inventory_unit_history for select to authenticated
  using (organization_id = public.auth_org_id());

create policy borrowings_read on public.borrowings for select to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','PENGURUS','BENDAHARA']::public.app_role[])
    or created_by = auth.uid()
    or (event_id is not null and public.is_event_panitia(event_id))
  ));
create policy borrowings_update on public.borrowings for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id());

create policy borrowing_items_read on public.borrowing_items for select to authenticated
  using (organization_id = public.auth_org_id() and exists (select 1 from public.borrowings b where b.id = borrowing_id));

create policy maintenance_read on public.inventory_maintenance for select to authenticated
  using (organization_id = public.auth_org_id());
create policy maintenance_update on public.inventory_maintenance for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]))
  with check (organization_id = public.auth_org_id());

-- DOCUMENTS -----------------------------------------------------------
create policy documents_public_read on public.documents for select to anon
  using (visibility = 'PUBLIC');
create policy documents_read on public.documents for select to authenticated
  using (organization_id = public.auth_org_id() or visibility = 'PUBLIC');
create policy documents_insert on public.documents for insert to authenticated
  with check (organization_id = public.auth_org_id() and uploaded_by = auth.uid() and (
    public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[])
    or (event_id is not null and public.is_event_panitia(event_id))
  ));
create policy documents_update on public.documents for update to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]) or uploaded_by = auth.uid()))
  with check (organization_id = public.auth_org_id());
create policy documents_delete on public.documents for delete to authenticated
  using (organization_id = public.auth_org_id() and (
    public.has_role(array['SUPER_ADMIN','PENGURUS']::public.app_role[]) or uploaded_by = auth.uid()));

-- NOTIFICATIONS -------------------------------------------------------
create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ACHIEVEMENTS (non-sensitif, tampil di landing) ----------------------
create policy achievements_read on public.achievements for select to anon, authenticated using (true);
create policy org_achievements_read on public.organization_achievements for select to anon, authenticated using (true);

-- AUDIT LOG: hanya dibaca pengurus inti, tidak ada policy update/delete --
create policy audit_logs_read on public.audit_logs for select to authenticated
  using (organization_id = public.auth_org_id() and public.has_role(array['SUPER_ADMIN','PENGURUS','BENDAHARA']::public.app_role[]));

-- org_counters: tanpa policy (hanya fungsi SECURITY DEFINER)

-- ---------------------------------------------------------------------
-- Hak eksekusi fungsi
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.auth_org_id(), public.auth_role(), public.has_role(public.app_role[]),
  public.is_event_panitia(uuid), public.can_manage_event(uuid) to authenticated, anon;
grant execute on function
  public.reverse_transaction(uuid, text),
  public.create_inventory_units(uuid, integer, public.item_condition),
  public.create_borrowing(jsonb),
  public.approve_borrowing(uuid, boolean, text),
  public.cancel_borrowing(uuid),
  public.handover_borrowing(uuid),
  public.return_borrowing(uuid, jsonb, date),
  public.start_maintenance(uuid, text),
  public.complete_maintenance(uuid, public.item_condition, numeric, text),
  public.set_unit_condition(uuid, public.item_condition, text),
  public.refresh_notifications(),
  public.refresh_achievements(uuid)
to authenticated;
-- Fungsi trigger & helper internal tetap dieksekusi oleh trigger (pemilik tabel).
grant execute on function public.set_updated_at(), public.audit_trigger(), public.finance_tx_before_write(),
  public.finance_tx_before_delete(), public.event_after_insert(), public.event_before_write(),
  public.event_task_before_write(), public.inventory_unit_before_write(), public.inventory_unit_after_write(),
  public.inventory_item_after_archive(), public.guard_profile_update(), public.handle_new_user()
to authenticated, anon;

revoke all on public.org_counters from anon, authenticated;
revoke insert, update, delete on public.audit_logs from anon, authenticated;
revoke insert, update, delete on public.inventory_unit_history from anon, authenticated;
revoke insert, delete on public.borrowings, public.borrowing_items from anon, authenticated;
revoke insert on public.inventory_units, public.inventory_maintenance from anon, authenticated;
revoke insert, delete on public.notifications from anon;

-- Kolom turunan (stok, status alur) hanya boleh diubah lewat fungsi/trigger.
revoke insert, update on public.inventory_items from anon, authenticated;
grant insert (organization_id, asset_code, unit_prefix, name, category_id, description, unit_label, photo,
              purchase_date, purchase_price, location)
  on public.inventory_items to authenticated;
grant update (asset_code, name, category_id, description, unit_label, photo, purchase_date, purchase_price,
              location, is_archived)
  on public.inventory_items to authenticated;

revoke update on public.inventory_units from anon, authenticated;
grant update (notes) on public.inventory_units to authenticated;

revoke update on public.borrowings from anon, authenticated;
grant update (borrower_phone, purpose, expected_return_date, notes) on public.borrowings to authenticated;

revoke update on public.inventory_maintenance from anon, authenticated;
grant update (issue, notes, cost) on public.inventory_maintenance to authenticated;

revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;
