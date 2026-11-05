"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Save, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { changePasswordAction, createUserAction, setUserRoleAction, updateMyProfileAction, updateOrganizationAction } from "@/lib/actions/settings";
import { ROLE_LABEL } from "@/lib/permissions";
import type { AppRole } from "@/types/db";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        done?.();
        router.refresh();
      } else toast.error(r.error);
    });
  return { pending, run };
}

export function ProfileForm({ fullName, email }: { fullName: string; email: string | null }) {
  const { pending, run } = useRun();
  const [name, setName] = useState(fullName);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateMyProfileAction({ full_name: name }));
      }}
    >
      <Field label="Email" htmlFor="me-email">
        <Input id="me-email" value={email ?? "-"} readOnly disabled />
      </Field>
      <Field label="Nama tampilan" htmlFor="me-name">
        <Input id="me-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </Field>
      <Button type="submit" loading={pending} disabled={name.trim() === fullName || name.trim().length < 2}>
        <Save /> Simpan profil
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const { pending, run } = useRun();
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const err = pw.confirm && pw.password !== pw.confirm ? "Konfirmasi password belum sama." : undefined;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => changePasswordAction(pw), () => setPw({ password: "", confirm: "" }));
      }}
    >
      <Field label="Password baru" htmlFor="pw-new" hint="Minimal 8 karakter.">
        <Input id="pw-new" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
      </Field>
      <Field label="Ulangi password" htmlFor="pw-confirm" error={err}>
        <Input id="pw-confirm" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
      </Field>
      <Button type="submit" variant="secondary" loading={pending} disabled={pw.password.length < 8 || Boolean(err) || !pw.confirm}>
        <KeyRound /> Ganti password
      </Button>
    </form>
  );
}

export function OrganizationForm({
  org,
}: {
  org: { name: string; tagline: string | null; about: string | null; location: string; strict_balance: boolean; public_inventory_summary: boolean };
}) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ ...org, tagline: org.tagline ?? "", about: org.about ?? "" });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateOrganizationAction(v));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama organisasi" htmlFor="org-name">
          <Input id="org-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Tagline" htmlFor="org-tag">
          <Input id="org-tag" value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} />
        </Field>
      </div>
      <Field label="Lokasi" htmlFor="org-loc">
        <Input id="org-loc" value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} />
      </Field>
      <Field label="Tentang (tampil di landing page)" htmlFor="org-about">
        <Textarea id="org-about" rows={4} value={v.about} onChange={(e) => setV({ ...v, about: e.target.value })} />
      </Field>
      <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
        <Checkbox
          label={
            <>
              <span className="font-semibold">Strict balance</span>
              <span className="block text-xs text-muted">Tolak pengeluaran/transfer yang membuat saldo akun negatif.</span>
            </>
          }
          checked={v.strict_balance}
          onChange={(e) => setV({ ...v, strict_balance: e.target.checked })}
        />
        <Checkbox
          label={
            <>
              <span className="font-semibold">Tampilkan ringkasan inventaris di website publik</span>
              <span className="block text-xs text-muted">Hanya nama barang & jumlah tersedia, tanpa data peminjam.</span>
            </>
          }
          checked={v.public_inventory_summary}
          onChange={(e) => setV({ ...v, public_inventory_summary: e.target.checked })}
        />
      </div>
      <Button type="submit" loading={pending}>
        <Save /> Simpan pengaturan
      </Button>
    </form>
  );
}

export interface UserRow {
  id: string;
  full_name: string;
  role: AppRole;
  member_id: string | null;
  email: string | null;
}

export function UserManager({
  users,
  members,
  currentUserId,
  canCreate,
}: {
  users: UserRow[];
  members: { id: string; name: string }[];
  currentUserId: string;
  canCreate: boolean;
}) {
  const { pending, run } = useRun();
  const [edit, setEdit] = useState<Record<string, { role: AppRole; member_id: string }>>({});
  const [open, setOpen] = useState(false);
  const [nu, setNu] = useState({ email: "", full_name: "", role: "ANGGOTA" as AppRole, member_id: "", password: "" });
  const linked = new Set(users.map((u) => u.member_id).filter(Boolean));

  return (
    <div className="space-y-4">
      {canCreate ? (
        <Button onClick={() => setOpen(true)}>
          <UserPlus /> Buat akun pengguna
        </Button>
      ) : (
        <p className="rounded-xl bg-bg-soft px-4 py-3 text-sm text-muted">
          Pembuatan akun dari halaman ini butuh <code>SUPABASE_SERVICE_ROLE_KEY</code> di server. Tanpa itu, buat akun lewat dashboard Supabase lalu atur perannya di sini.
        </p>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {users.map((u) => {
          const e = edit[u.id] ?? { role: u.role, member_id: u.member_id ?? "" };
          const dirty = e.role !== u.role || (e.member_id || null) !== u.member_id;
          const self = u.id === currentUserId;
          return (
            <li key={u.id} className="grid gap-3 p-4 md:grid-cols-[1fr_180px_220px_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={u.full_name} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {u.full_name} {self ? <Badge tone="green">Anda</Badge> : null}
                  </p>
                  <p className="truncate text-xs text-muted">{u.email ?? "email tersembunyi"}</p>
                </div>
              </div>
              <Select aria-label={`Peran ${u.full_name}`} value={e.role} disabled={self} onChange={(ev) => setEdit({ ...edit, [u.id]: { ...e, role: ev.target.value as AppRole } })}>
                {Object.entries(ROLE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Select aria-label={`Anggota terhubung untuk ${u.full_name}`} value={e.member_id} onChange={(ev) => setEdit({ ...edit, [u.id]: { ...e, member_id: ev.target.value } })}>
                <option value="">Tidak terhubung ke anggota</option>
                {members
                  .filter((m) => !linked.has(m.id) || m.id === u.member_id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </Select>
              <Button
                size="sm"
                variant={dirty ? "primary" : "secondary"}
                disabled={!dirty}
                loading={pending && dirty}
                onClick={() => {
                  if (e.role === "SUPER_ADMIN" && u.role !== "SUPER_ADMIN" && !confirm(`Jadikan ${u.full_name} Super Admin? Super Admin punya semua akses.`)) return;
                  run(() => setUserRoleAction(u.id, e.role, e.member_id || null), () => setEdit((x) => { const n = { ...x }; delete n[u.id]; return n; }));
                }}
              >
                Simpan
              </Button>
            </li>
          );
        })}
      </ul>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Buat akun pengguna"
        description="Akun langsung aktif dan terhubung ke Pemuda RW 05. Berikan password sementara secara langsung, bukan lewat grup."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              loading={pending}
              disabled={!nu.email || nu.full_name.trim().length < 2 || nu.password.length < 8}
              onClick={() =>
                run(() => createUserAction({ ...nu, member_id: nu.member_id || null }), () => {
                  setOpen(false);
                  setNu({ email: "", full_name: "", role: "ANGGOTA", member_id: "", password: "" });
                })
              }
            >
              Buat akun
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Email" htmlFor="nu-email" required>
            <Input id="nu-email" type="email" autoComplete="off" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
          </Field>
          <Field label="Nama" htmlFor="nu-name" required>
            <Input id="nu-name" value={nu.full_name} onChange={(e) => setNu({ ...nu, full_name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Peran" htmlFor="nu-role">
              <Select id="nu-role" value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as AppRole })}>
                {Object.entries(ROLE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Hubungkan ke anggota" htmlFor="nu-member">
              <Select
                id="nu-member"
                value={nu.member_id}
                onChange={(e) => {
                  const m = members.find((x) => x.id === e.target.value);
                  setNu({ ...nu, member_id: e.target.value, full_name: nu.full_name || m?.name || "" });
                }}
              >
                <option value="">Tidak</option>
                {members
                  .filter((m) => !linked.has(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <Field label="Password sementara" htmlFor="nu-pw" hint="Minimal 8 karakter. Minta pengguna menggantinya di Pengaturan setelah login.">
            <Input id="nu-pw" type="password" autoComplete="new-password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
