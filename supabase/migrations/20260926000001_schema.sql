-- =====================================================================
-- BASECAMP PEMUDA RW 05 — Skema inti
-- Kwarasan • Nogotirto • Gamping • Sleman
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
create type public.app_role as enum ('SUPER_ADMIN', 'PENGURUS', 'BENDAHARA', 'PANITIA', 'ANGGOTA');
create type public.member_role as enum ('KETUA', 'WAKIL', 'SEKRETARIS', 'BENDAHARA', 'KOORDINATOR', 'ANGGOTA');
create type public.member_status as enum ('ACTIVE', 'INACTIVE');
create type public.event_kind as enum ('EVENT', 'KEGIATAN');
create type public.event_status as enum ('DRAFT', 'PLANNING', 'READY', 'ONGOING', 'COMPLETED', 'CANCELLED');
create type public.finance_type as enum ('INCOME', 'EXPENSE', 'TRANSFER');
create type public.category_type as enum ('INCOME', 'EXPENSE');
create type public.account_type as enum ('CASH', 'BANK', 'EWALLET', 'EVENT');
create type public.payment_method as enum ('CASH', 'TRANSFER', 'QRIS', 'EWALLET', 'OTHER');
create type public.item_condition as enum ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'LOST');
create type public.unit_status as enum ('AVAILABLE', 'BORROWED', 'MAINTENANCE', 'DAMAGED', 'LOST');
create type public.item_status as enum ('AVAILABLE', 'PARTIAL', 'BORROWED', 'MAINTENANCE', 'EMPTY', 'ARCHIVED');
create type public.borrowing_status as enum ('REQUESTED', 'APPROVED', 'BORROWED', 'RETURNED', 'REJECTED', 'CANCELLED');
create type public.maintenance_status as enum ('OPEN', 'IN_PROGRESS', 'DONE');
create type public.visibility as enum ('PUBLIC', 'INTERNAL');

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- ORGANIZATIONS & PROFILES
-- ---------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_name text not null default 'Pemuda RW 05',
  location text not null,
  tagline text,
  about text,
  logo text,
  settings jsonb not null default jsonb_build_object(
    'strict_balance', true,
    'public_inventory_summary', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  nickname text,
  photo text,
  join_date date not null default current_date,
  role public.member_role not null default 'ANGGOTA',
  status public.member_status not null default 'ACTIVE',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index members_org_idx on public.members (organization_id, status);
create index members_name_idx on public.members (organization_id, lower(name));

-- Data kontak anggota dipisah agar bisa dibatasi RLS lebih ketat.
create table public.member_private (
  member_id uuid primary key references public.members(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index member_private_org_idx on public.member_private (organization_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  full_name text not null default 'Pemuda RW 05',
  role public.app_role not null default 'ANGGOTA',
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_org_idx on public.profiles (organization_id, role);
create unique index profiles_member_uidx on public.profiles (member_id) where member_id is not null;

-- ---------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 160),
  slug text not null,
  kind public.event_kind not null default 'EVENT',
  description text,
  cover text,
  location text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status public.event_status not null default 'DRAFT',
  budget numeric(14,2) not null default 0 check (budget >= 0),
  target_participant integer check (target_participant is null or target_participant >= 0),
  actual_participant integer check (actual_participant is null or actual_participant >= 0),
  is_public boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_dates_chk check (end_date >= start_date),
  constraint events_slug_uq unique (organization_id, slug)
);
create index events_org_start_idx on public.events (organization_id, start_date desc);
create index events_org_status_idx on public.events (organization_id, status);
create index events_public_idx on public.events (organization_id, is_public, start_date);

create table public.event_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  committee_role text not null default 'Anggota Panitia',
  division text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_members_uq unique (event_id, member_id)
);
create index event_members_member_idx on public.event_members (member_id);

create table public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  assignee_member_id uuid references public.members(id) on delete set null,
  due_date date,
  is_done boolean not null default false,
  done_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_tasks_event_idx on public.event_tasks (event_id, sort_order);

create table public.event_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  pic text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_schedules_time_chk check (end_at is null or end_at >= start_at)
);
create index event_schedules_event_idx on public.event_schedules (event_id, start_at);

-- ---------------------------------------------------------------------
-- FINANCE
-- ---------------------------------------------------------------------
create table public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type public.account_type not null default 'CASH',
  event_id uuid unique references public.events(id) on delete restrict,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_accounts_event_chk check ((type = 'EVENT') = (event_id is not null)),
  constraint finance_accounts_name_uq unique (organization_id, name)
);

create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type public.category_type not null,
  color text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_categories_uq unique (organization_id, type, name)
);

create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_code text not null,
  transaction_date date not null,
  type public.finance_type not null,
  category_id uuid references public.finance_categories(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  description text,
  event_id uuid references public.events(id) on delete restrict,
  account_id uuid not null references public.finance_accounts(id) on delete restrict,
  to_account_id uuid references public.finance_accounts(id) on delete restrict,
  payment_method public.payment_method not null default 'CASH',
  attachment text,
  reversal_of uuid references public.finance_transactions(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  is_approved boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_transactions_code_uq unique (transaction_code),
  constraint finance_transactions_transfer_chk check (
    (type = 'TRANSFER' and to_account_id is not null and to_account_id <> account_id)
    or (type <> 'TRANSFER' and to_account_id is null)
  ),
  constraint finance_transactions_category_chk check (type = 'TRANSFER' or category_id is not null)
);
create index fin_tx_org_date_idx on public.finance_transactions (organization_id, transaction_date desc);
create index fin_tx_account_idx on public.finance_transactions (account_id) where is_approved;
create index fin_tx_to_account_idx on public.finance_transactions (to_account_id) where is_approved and to_account_id is not null;
create index fin_tx_event_idx on public.finance_transactions (event_id) where event_id is not null;
create index fin_tx_public_idx on public.finance_transactions (organization_id, transaction_date desc) where is_public and is_approved;
create index fin_tx_category_idx on public.finance_transactions (category_id);

-- ---------------------------------------------------------------------
-- INVENTORY
-- ---------------------------------------------------------------------
create table public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_categories_uq unique (organization_id, name)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_code text not null,
  unit_prefix text not null check (unit_prefix ~ '^[A-Z]{2,5}$'),
  name text not null check (char_length(name) between 2 and 120),
  category_id uuid references public.inventory_categories(id) on delete set null,
  description text,
  unit_label text not null default 'unit',
  photo text,
  purchase_date date,
  purchase_price numeric(14,2) check (purchase_price is null or purchase_price >= 0),
  location text,
  status public.item_status not null default 'EMPTY',
  total_quantity integer not null default 0 check (total_quantity >= 0),
  available_quantity integer not null default 0 check (available_quantity >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_asset_uq unique (organization_id, asset_code),
  constraint inventory_items_prefix_uq unique (organization_id, unit_prefix),
  constraint inventory_items_qty_chk check (available_quantity <= total_quantity)
);
create index inventory_items_org_idx on public.inventory_items (organization_id, lower(name));

create table public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  unit_code text not null,
  condition public.item_condition not null default 'GOOD',
  status public.unit_status not null default 'AVAILABLE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_units_code_uq unique (organization_id, unit_code)
);
create index inventory_units_item_idx on public.inventory_units (inventory_item_id, status);

create table public.inventory_unit_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inventory_unit_id uuid not null references public.inventory_units(id) on delete cascade,
  action text not null,
  from_status public.unit_status,
  to_status public.unit_status,
  from_condition public.item_condition,
  to_condition public.item_condition,
  note text,
  reference_id uuid,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_unit_history_unit_idx on public.inventory_unit_history (inventory_unit_id, created_at desc);

create table public.borrowings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  borrowing_code text not null,
  borrower_name text not null check (char_length(borrower_name) between 2 and 120),
  borrower_phone text,
  borrower_member_id uuid references public.members(id) on delete set null,
  purpose text not null,
  event_id uuid references public.events(id) on delete set null,
  borrow_date date not null,
  expected_return_date date not null,
  actual_return_date date,
  status public.borrowing_status not null default 'REQUESTED',
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint borrowings_code_uq unique (organization_id, borrowing_code),
  constraint borrowings_dates_chk check (expected_return_date >= borrow_date)
);
create index borrowings_org_status_idx on public.borrowings (organization_id, status, expected_return_date);
create index borrowings_event_idx on public.borrowings (event_id) where event_id is not null;

create table public.borrowing_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  borrowing_id uuid not null references public.borrowings(id) on delete cascade,
  inventory_unit_id uuid not null references public.inventory_units(id) on delete restrict,
  condition_before public.item_condition,
  condition_after public.item_condition,
  returned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint borrowing_items_uq unique (borrowing_id, inventory_unit_id)
);
create index borrowing_items_unit_idx on public.borrowing_items (inventory_unit_id);

create table public.inventory_maintenance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inventory_unit_id uuid not null references public.inventory_units(id) on delete cascade,
  borrowing_id uuid references public.borrowings(id) on delete set null,
  issue text not null,
  status public.maintenance_status not null default 'OPEN',
  cost numeric(14,2) check (cost is null or cost >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result_condition public.item_condition,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_maintenance_org_idx on public.inventory_maintenance (organization_id, status);
create index inventory_maintenance_unit_idx on public.inventory_maintenance (inventory_unit_id);

-- ---------------------------------------------------------------------
-- DOCUMENTS
-- ---------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  file_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  width integer,
  height integer,
  caption text,
  taken_at date,
  visibility public.visibility not null default 'INTERNAL',
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_path_uq unique (file_path)
);
create index documents_org_idx on public.documents (organization_id, created_at desc);
create index documents_event_idx on public.documents (event_id);
create index documents_public_idx on public.documents (organization_id, created_at desc) where visibility = 'PUBLIC';

-- ---------------------------------------------------------------------
-- NOTIFICATIONS, ACHIEVEMENTS, AUDIT
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  dedupe_key text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);
create unique index notifications_dedupe_uidx on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  metric text not null,
  threshold integer not null check (threshold > 0),
  icon text not null default 'trophy',
  tier text not null default 'bronze',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_achievements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  progress integer not null default 0,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_achievements_uq unique (organization_id, achievement_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  entity text not null,
  entity_id uuid,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- Counter untuk kode transaksi / peminjaman
create table public.org_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  value integer not null default 0,
  primary key (organization_id, key)
);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','members','member_private','profiles','events','event_members','event_tasks',
    'event_schedules','finance_accounts','finance_categories','finance_transactions',
    'inventory_categories','inventory_items','inventory_units','borrowings','borrowing_items',
    'inventory_maintenance','documents','notifications','achievements','organization_achievements'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;
