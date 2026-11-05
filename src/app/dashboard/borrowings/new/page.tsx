import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getAvailableUnits } from "@/lib/services/borrowings";
import { getActiveMembers } from "@/lib/services/events";
import { todayJakarta } from "@/lib/utils/format";
import { BorrowingForm } from "@/components/borrowings/borrowing-form";

export const metadata: Metadata = { title: "Ajukan Peminjaman" };

function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export default async function NewBorrowingPage({ searchParams }: PageProps<"/dashboard/borrowings/new">) {
  const session = await requirePermission("borrowing.request");
  const sp = await searchParams;
  const supabase = await createClient();
  const [groups, members, events] = await Promise.all([
    getAvailableUnits(session.organization.id),
    getActiveMembers(session.organization.id),
    supabase.from("events").select("id,name").eq("organization_id", session.organization.id).in("status", ["DRAFT", "PLANNING", "READY", "ONGOING"]).order("start_date"),
  ]);
  const unitCode = typeof sp.unit === "string" ? sp.unit.toUpperCase() : undefined;
  const itemId = typeof sp.item === "string" ? sp.item : undefined;
  const eventId = typeof sp.event === "string" ? sp.event : undefined;
  const unit = unitCode ? groups.flatMap((g) => g.units.map((u) => ({ ...u, group: g.id }))).find((u) => u.code === unitCode) : undefined;
  const today = todayJakarta();

  return (
    <div className="space-y-4">
      <Link href="/dashboard/borrowings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua peminjaman
      </Link>
      {unitCode && !unit ? (
        <p role="alert" className="rounded-xl bg-warning-bg px-4 py-3 text-sm">
          Unit {unitCode} sedang tidak tersedia (dipinjam, maintenance, atau sudah diajukan). Pilih unit lain di bawah.
        </p>
      ) : null}
      <BorrowingForm
        groups={groups}
        members={members.map((m) => ({ id: m.id, name: m.name }))}
        events={(events.data ?? []) as { id: string; name: string }[]}
        canApprove={can(session.profile.role, "borrowing.approve")}
        defaults={{
          borrow_date: today,
          expected_return_date: addDays(today, 2),
          event_id: eventId && (events.data ?? []).some((e) => e.id === eventId) ? eventId : undefined,
          unitIds: unit ? [unit.id] : undefined,
          openItem: unit?.group ?? itemId,
        }}
      />
    </div>
  );
}
