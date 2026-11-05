import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getMemberProfile } from "@/lib/services/members";
import { Card, CardBody } from "@/components/ui/card";
import { MemberForm } from "@/components/members/member-form";

export const metadata: Metadata = { title: "Ubah Anggota" };

export default async function EditMemberPage({ params }: PageProps<"/dashboard/members/[id]/edit">) {
  await requirePermission("members.manage");
  const { id } = await params;
  const p = await getMemberProfile(id);
  if (!p) notFound();
  const m = p.member;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/dashboard/members/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Kembali ke profil
      </Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold">Ubah {m.name}</h1>
      <Card className="mt-4">
        <CardBody>
          <MemberForm
            editId={id}
            photoUrl={m.photoUrl}
            defaults={{
              name: m.name,
              nickname: m.nickname ?? "",
              join_date: m.join_date,
              role: m.role,
              status: m.status,
              bio: m.bio ?? "",
              phone: p.contact?.phone ?? "",
              address: p.contact?.address ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
