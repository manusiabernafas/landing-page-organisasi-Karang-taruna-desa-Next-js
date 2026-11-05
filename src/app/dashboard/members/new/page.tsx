import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { todayJakarta } from "@/lib/utils/format";
import { Card, CardBody } from "@/components/ui/card";
import { MemberForm } from "@/components/members/member-form";

export const metadata: Metadata = { title: "Tambah Anggota" };

export default async function NewMemberPage() {
  await requirePermission("members.manage");
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/members" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Semua anggota
      </Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold">Tambah anggota</h1>
      <Card className="mt-4">
        <CardBody>
          <MemberForm defaults={{ join_date: todayJakarta() }} />
        </CardBody>
      </Card>
    </div>
  );
}
