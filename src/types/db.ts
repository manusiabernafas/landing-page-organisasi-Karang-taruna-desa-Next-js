export type AppRole = "SUPER_ADMIN" | "PENGURUS" | "BENDAHARA" | "PANITIA" | "ANGGOTA";
export type MemberRole = "KETUA" | "WAKIL" | "SEKRETARIS" | "BENDAHARA" | "KOORDINATOR" | "ANGGOTA";
export type MemberStatus = "ACTIVE" | "INACTIVE";
export type EventKind = "EVENT" | "KEGIATAN";
export type EventStatus = "DRAFT" | "PLANNING" | "READY" | "ONGOING" | "COMPLETED" | "CANCELLED";
export type FinanceType = "INCOME" | "EXPENSE" | "TRANSFER";
export type CategoryType = "INCOME" | "EXPENSE";
export type AccountType = "CASH" | "BANK" | "EWALLET" | "EVENT";
export type PaymentMethod = "CASH" | "TRANSFER" | "QRIS" | "EWALLET" | "OTHER";
export type ItemCondition = "EXCELLENT" | "GOOD" | "FAIR" | "DAMAGED" | "LOST";
export type UnitStatus = "AVAILABLE" | "BORROWED" | "MAINTENANCE" | "DAMAGED" | "LOST";
export type ItemStatus = "AVAILABLE" | "PARTIAL" | "BORROWED" | "MAINTENANCE" | "EMPTY" | "ARCHIVED";
export type BorrowingStatus = "REQUESTED" | "APPROVED" | "BORROWED" | "RETURNED" | "REJECTED" | "CANCELLED";
export type MaintenanceStatus = "OPEN" | "IN_PROGRESS" | "DONE";
export type Visibility = "PUBLIC" | "INTERNAL";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  short_name: string;
  location: string;
  tagline: string | null;
  about: string | null;
  logo: string | null;
  settings: { strict_balance?: boolean; public_inventory_summary?: boolean };
}

export interface Profile {
  id: string;
  organization_id: string | null;
  member_id: string | null;
  full_name: string;
  role: AppRole;
  avatar: string | null;
}

export interface Member {
  id: string;
  organization_id: string;
  name: string;
  nickname: string | null;
  photo: string | null;
  join_date: string;
  role: MemberRole;
  status: MemberStatus;
  bio: string | null;
  created_at: string;
}

export interface MemberPrivate {
  member_id: string;
  phone: string | null;
  address: string | null;
}

export interface EventRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  kind: EventKind;
  description: string | null;
  cover: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  status: EventStatus;
  budget: number;
  target_participant: number | null;
  actual_participant: number | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventTask {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  assignee_member_id: string | null;
  due_date: string | null;
  is_done: boolean;
  done_at: string | null;
  sort_order: number;
}

export interface EventSchedule {
  id: string;
  event_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  pic: string | null;
  notes: string | null;
}

export interface EventMember {
  id: string;
  event_id: string;
  member_id: string;
  committee_role: string;
  division: string | null;
}

export interface FinanceAccount {
  id: string;
  organization_id: string;
  name: string;
  type: AccountType;
  event_id: string | null;
  description: string | null;
  is_active: boolean;
}

export interface AccountBalance {
  account_id: string;
  name: string;
  type: AccountType;
  event_id: string | null;
  is_active: boolean;
  total_income: number;
  total_expense: number;
  transfer_in: number;
  transfer_out: number;
  balance: number;
}

export interface EventFinanceSummary {
  event_id: string;
  name: string;
  budget: number;
  account_id: string | null;
  income: number;
  expense: number;
  transfer_in: number;
  transfer_out: number;
  balance: number;
  remaining_budget: number;
  budget_used_pct: number;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  description: string | null;
  is_active: boolean;
}

export interface FinanceTransaction {
  id: string;
  organization_id: string;
  transaction_code: string;
  transaction_date: string;
  type: FinanceType;
  category_id: string | null;
  amount: number;
  description: string | null;
  event_id: string | null;
  account_id: string;
  to_account_id: string | null;
  payment_method: PaymentMethod;
  attachment: string | null;
  reversal_of: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_approved: boolean;
  is_public: boolean;
  created_at: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface InventoryItem {
  id: string;
  organization_id: string;
  asset_code: string;
  unit_prefix: string;
  name: string;
  category_id: string | null;
  description: string | null;
  unit_label: string;
  photo: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  location: string | null;
  status: ItemStatus;
  total_quantity: number;
  available_quantity: number;
  is_archived: boolean;
}

export interface InventoryUnit {
  id: string;
  inventory_item_id: string;
  unit_code: string;
  condition: ItemCondition;
  status: UnitStatus;
  notes: string | null;
}

export interface UnitHistory {
  id: string;
  inventory_unit_id: string;
  action: string;
  from_status: UnitStatus | null;
  to_status: UnitStatus | null;
  from_condition: ItemCondition | null;
  to_condition: ItemCondition | null;
  note: string | null;
  reference_id: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface Borrowing {
  id: string;
  organization_id: string;
  borrowing_code: string;
  borrower_name: string;
  borrower_phone: string | null;
  borrower_member_id: string | null;
  purpose: string;
  event_id: string | null;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  status: BorrowingStatus;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_unit_id: string;
  condition_before: ItemCondition | null;
  condition_after: ItemCondition | null;
  returned_at: string | null;
  notes: string | null;
}

export interface Maintenance {
  id: string;
  inventory_unit_id: string;
  borrowing_id: string | null;
  issue: string;
  status: MaintenanceStatus;
  cost: number | null;
  started_at: string;
  completed_at: string | null;
  result_condition: ItemCondition | null;
  notes: string | null;
}

export interface DocumentRow {
  id: string;
  organization_id: string;
  event_id: string | null;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  taken_at: string | null;
  visibility: Visibility;
  uploaded_by: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  icon: string;
  tier: string;
  sort_order: number;
}

export interface OrgAchievement {
  achievement_id: string;
  progress: number;
  unlocked_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrgMetrics {
  inventory_items: number;
  inventory_units: number;
  events_completed: number;
  activities_completed: number;
  transactions: number;
  members_active: number;
  documents: number;
  tasks_done: number;
  borrowings_returned: number;
}
