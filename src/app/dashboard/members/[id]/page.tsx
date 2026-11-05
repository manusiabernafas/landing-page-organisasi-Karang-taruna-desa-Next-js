import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarHeart, ListChecks, MapPin, Pencil, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { getMemberProfile } from "@/lib/services/members";
import { EVENT_STATUS, MEMBER_ROLE } from "@/lib/utils/labels";
import { fmtDate } from "@/lib/utils/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { AppRole } from "@/types/db";

export const metadata: Metadata = { title: "Profil Anggota" };

export default async function MemberProfilePage({ params }: PageProps<"/dashboard/members/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const p = await getMemberProfile(id);
  if (!p) notFound();
  const m = p.member;
  const canManage = can(session.profile.role, "members.manage");
  const years = Math.max(0, new Date().getFullYear() - Number(m.join_date.slice(0, 4)));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/dashboard/members" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua anggota
      </Link>

      {/* Profile card ala kartu pemain, tetap profesional */}
      <section className="relative overflow-hidden rounded-[26px] bg-forest p-5 text-white shadow-soft sm:p-7">
        <svg viewBox="0 0 400 200" className="absolute -right-10 -bottom-6 h-48 opacity-10" aria-hidden>
          <path d="M150 200 L270 50 L390 200 Z" fill="#f2b632" />
          <rect x="268" y="10" width="4" height="42" fill="#f2b632" />
        </svg>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="rounded-full bg-gold p-1">
            <Avatar name={m.name} src={m.photoUrl} size={104} className="ring-4 ring-forest" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-extrabold tracking-[0.14em] text-forest uppercase">{MEMBER_ROLE[m.role]}</span>
              {m.status === "INACTIVE" ? <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase">Nonaktif</span> : null}
              {p.appRole ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">
                  <ShieldCheck className="size-3" aria-hidden /> Akun {ROLE_LABEL[p.appRole as AppRole]}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{m.name}</h1>
            {m.nickname ? <p className="text-[#b9cbb8]">Dipanggil &ldquo;{m.nickname}&rdquo;</p> : null}
            {m.bio ? <p className="mt-2 max-w-xl text-sm text-[#dbe6d8]">{m.bio}</p> : null}
          </div>
          {canManage ? (
            <ButtonLink href={`/dashboard/members/${id}/edit`} size="sm" className="self-start bg-white/12 text-white shadow-none hover:bg-white/20">
              <Pencil /> Ubah
            </ButtonLink>
          ) : null}
        </div>
        <dl className="relative mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-white/8 p-3 text-center ring-1 ring-white/10">
          <div>
            <dt className="text-[11px] text-[#9fb39e] uppercase">Bergabung</dt>
            <dd className="font-display text-lg font-extrabold">{fmtDate(m.join_date, "MMM yyyy")}</dd>
            <dd className="text-[11px] text-[#9fb39e]">{years ? `${years} tahun` : "tahun ini"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#9fb39e] uppercase">Kepanitiaan</dt>
            <dd className="font-display text-lg font-extrabold tabular">{p.committees.length}</dd>
            <dd className="text-[11px] text-[#9fb39e]">event</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#9fb39e] uppercase">Quest</dt>
            <dd className="font-display text-lg font-extrabold tabular">{p.tasksDone}</dd>
            <dd className="text-[11px] text-[#9fb39e]">diselesaikan</dd>
          </div>
        </dl>
      </section>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Sparkles className="size-3.5" aria-hidden /> Angka di atas adalah catatan kontribusi, bukan peringkat atau penilaian.
      </p>

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Partisipasi event" icon={<CalendarHeart className="size-5 text-grass" aria-hidden />} />
          <CardBody>
            {p.committees.length === 0 ? (
              <p className="text-sm text-muted">Belum tercatat di kepanitiaan event.</p>
            ) : (
              <ul className="divide-y divide-border">
                {p.committees.map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/events/${c.event!.id}?tab=committee`} className="flex items-center justify-between gap-3 py-2.5 hover:text-grass-600">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{c.event!.name}</p>
                        <p className="text-xs text-muted">
                          {c.committee_role}
                          {c.division ? ` · Seksi ${c.division}` : ""} · {fmtDate(c.event!.start_date, "MMM yyyy")}
                        </p>
                      </div>
                      <Badge tone={EVENT_STATUS[c.event!.status as keyof typeof EVENT_STATUS].tone}>{EVENT_STATUS[c.event!.status as keyof typeof EVENT_STATUS].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Aktivitas quest" icon={<ListChecks className="size-5 text-grass" aria-hidden />} />
            <CardBody>
              <p className="text-sm text-muted">
                {p.tasksTotal ? `${p.tasksDone} dari ${p.tasksTotal} quest yang ditugaskan sudah selesai.` : "Belum ada quest yang ditugaskan."}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Kontak" />
            <CardBody>
              {p.contact ? (
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 text-muted" aria-hidden />
                    {p.contact.phone ? (
                      <a href={`tel:${p.contact.phone}`} className="font-semibold text-grass-600 hover:underline">
                        {p.contact.phone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 text-muted" aria-hidden />
                    {p.contact.address ?? "-"}
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-muted">Data kontak hanya terlihat oleh pengurus inti dan anggota yang bersangkutan.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
