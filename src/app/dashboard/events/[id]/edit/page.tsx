import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/services/storage";
import { toLocalInput, toNumber } from "@/lib/utils/format";
import { Card, CardBody } from "@/components/ui/card";
import { EventForm } from "@/components/events/event-form";
import type { EventRow } from "@/types/db";

export const metadata: Metadata = { title: "Ubah Event" };

export default async function EditEventPage({ params }: PageProps<"/dashboard/events/[id]/edit">) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle<EventRow>();
  if (!e) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/dashboard/events/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Kembali ke event
      </Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold">Ubah {e.name}</h1>
      <Card className="mt-4">
        <CardBody>
          <EventForm
            editId={id}
            coverUrl={mediaUrl(e.cover)}
            defaults={{
              name: e.name,
              kind: e.kind,
              description: e.description ?? "",
              location: e.location ?? "",
              start_date: toLocalInput(e.start_date),
              end_date: toLocalInput(e.end_date),
              status: e.status,
              budget: toNumber(e.budget),
              target_participant: e.target_participant,
              actual_participant: e.actual_participant,
              is_public: e.is_public,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
