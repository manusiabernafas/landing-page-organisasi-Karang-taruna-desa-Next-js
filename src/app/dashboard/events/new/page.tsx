import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { EventForm } from "@/components/events/event-form";
import { todayJakarta } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Buat Event" };

export default async function NewEventPage() {
  await requirePermission("event.create");
  const today = todayJakarta();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua event
      </Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold">Buat event baru</h1>
      <p className="mt-1 text-sm text-muted">Akun dana event dibuat otomatis agar keuangannya terpisah dari kas organisasi.</p>
      <Card className="mt-4">
        <CardBody>
          <EventForm defaults={{ start_date: `${today}T08:00`, end_date: `${today}T12:00` }} />
        </CardBody>
      </Card>
    </div>
  );
}
