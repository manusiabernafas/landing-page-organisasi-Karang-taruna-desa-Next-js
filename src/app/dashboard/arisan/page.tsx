import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Dices, Undo2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, pct, todayJakarta } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { HostDraw } from "@/components/arisan/host-draw";
import { undoHostAction } from "@/lib/actions/dues";

export const metadata: Metadata = { title: "Arisan Tuan Rumah Rapat" };

export default async function ArisanPage({ searchParams }: PageProps<"/dashboard/arisan">) {
  const session = await requireSession();
  const sp = await searchParams;
  const today = todayJakarta();
  const thisYear = Number(today.slice(0, 4));
  const year = Number(sp.year) >= 2000 && Number(sp.year) <= 2100 ? Number(sp.year) : thisYear;
  const supabase = await createClient();
  const [houses, draws] = await Promise.all([
    supabase
      .from("households")
      .select("id,name,address,is_active,host_eligible, members:household_members(member:members(name,nickname))")
      .eq("organization_id", session.organization.id)
      .order("name"),
    supabase
      .from("host_draws")
      .select("id,household_id,meeting_date,method,note,created_at, household:households(name,address)")
      .eq("organization_id", session.organization.id)
      .eq("year", year)
      .order("created_at", { ascending: false }),
  ]);
  type H = { id: string; name: string; address: string | null; is_active: boolean; host_eligible: boolean; members: { member: { name: string; nickname: string | null } | null }[] };
  type D = { id: string; household_id: string; meeting_date: string | null; method: string; note: string | null; created_at: string; household: { name: string; address: string | null } | null };
  const all = ((houses.data ?? []) as unknown as H[]).filter((h) => h.is_active && h.host_eligible);
  const list = (draws.data ?? []) as unknown as D[];
  const hosted = new Set(list.map((d) => d.household_id));
  const candidates = all.filter((h) => !hosted.has(h.id));
  const canManage = can(session.profile.role, "arisan.manage");
  const next = list[0];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Arisan Rapat"
        title="Giliran tuan rumah rapat"
        description="Tempat rapat pemuda ditentukan lewat kocokan. Setiap rumah hanya sekali jadi tuan rumah dalam setahun; anggota baru otomatis ikut."
        icon={
          <ResourceIcon tone="gold" size="lg">
            <Dices />
          </ResourceIcon>
        }
      />
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/arisan?year=${year - 1}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-bg-soft" aria-label="Tahun sebelumnya">
          <ChevronLeft className="size-5" />
        </Link>
        <p className="font-display text-xl font-bold tabular">{year}</p>
        <Link href={`/dashboard/arisan?year=${year + 1}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-bg-soft" aria-label="Tahun berikutnya">
          <ChevronRight className="size-5" />
        </Link>
      </div>

      {canManage && year === thisYear ? (
        <HostDraw year={year} candidates={candidates.map((c) => ({ id: c.id, name: c.name }))} defaultDate={today} />
      ) : next ? (
        <div className="rounded-card bg-forest p-5 text-white">
          <p className="text-xs font-bold tracking-[0.16em] text-gold uppercase">Tuan rumah terakhir</p>
          <p className="font-display text-2xl font-extrabold">{next.household?.name}</p>
          <p className="text-sm text-[#b9cbb8]">
            {next.meeting_date ? `Rapat ${fmtDate(next.meeting_date, "EEEE, d MMMM yyyy")}` : "Tanggal rapat menyusul"}
            {next.household?.address ? ` · ${next.household.address}` : ""}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader
            title={`Peserta ${year}`}
            description={`${hosted.size} dari ${all.length} rumah sudah jadi tuan rumah`}
          />
          <CardBody className="space-y-3">
            <Progress value={pct(hosted.size, all.length)} tone="gold" label="Rumah yang sudah ketempatan" />
            {all.length === 0 ? (
              <p className="text-sm text-muted">Belum ada rumah peserta. Atur di menu Iuran → Daftar tagihan.</p>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {all.map((h) => {
                  const done = hosted.has(h.id);
                  return (
                    <li key={h.id} className={cn("flex items-start gap-2 rounded-xl px-2.5 py-2 text-sm", done ? "bg-grass-100" : "bg-surface-2")}>
                      {done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-grass-600" aria-label="Sudah" /> : <Circle className="mt-0.5 size-4 shrink-0 text-subtle" aria-label="Belum" />}
                      <span className="min-w-0">
                        <span className={cn("block truncate font-semibold", done && "text-grass-600")}>{h.name}</span>
                        {h.members.length > 1 ? (
                          <span className="block truncate text-xs text-muted">{h.members.map((m) => m.member?.nickname ?? m.member?.name).join(", ")}</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Riwayat tuan rumah" />
          <CardBody>
            {list.length === 0 ? (
              <EmptyState compact illustration="calendar" title={`Belum ada kocokan tahun ${year}.`} />
            ) : (
              <ol className="space-y-2">
                {list.map((d, i) => (
                  <li key={d.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border p-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-100 font-display font-extrabold text-gold-600 tabular">{list.length - i}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{d.household?.name}</p>
                        <p className="text-xs text-muted">
                          {d.meeting_date ? fmtDate(d.meeting_date, "EEEE, d MMM yyyy") : "Tanggal menyusul"}
                          {d.household?.address ? ` · ${d.household.address}` : ""}
                        </p>
                        <Badge tone={d.method === "RANDOM" ? "sky" : "gray"} className="mt-1">
                          {d.method === "RANDOM" ? "Hasil kocokan" : "Ditetapkan"}
                        </Badge>
                      </div>
                    </div>
                    {canManage && i === 0 && year === thisYear ? (
                      <ConfirmAction
                        label="Batalkan"
                        icon={<Undo2 />}
                        variant="ghost"
                        title="Batalkan hasil kocokan terakhir?"
                        description="Pakai bila rumah ini berhalangan. Rumah akan kembali ikut kocokan dan pembatalan tercatat di audit log."
                        confirmLabel="Batalkan hasil"
                        action={undoHostAction.bind(null, d.id)}
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
