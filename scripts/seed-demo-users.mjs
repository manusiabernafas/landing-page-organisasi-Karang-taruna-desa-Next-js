// Membuat / memperbarui 5 akun demo BASECAMP PEMUDA RW 05.
// Jalankan: npm run seed:users
// Butuh di .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD (min. 8 karakter).
// Password tidak pernah ditulis di kode — selalu dibaca dari DEMO_PASSWORD.
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
const slug = process.env.NEXT_PUBLIC_ORG_SLUG || "pemuda-rw05-kwarasan";

if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.");
if (!password || password.length < 8) throw new Error("DEMO_PASSWORD wajib diisi, minimal 8 karakter.");

const DEMO = [
  { email: "superadmin@basecamp-rw05.test", role: "SUPER_ADMIN", member: "Muhammad Rizky Pratama" },
  { email: "pengurus@basecamp-rw05.test", role: "PENGURUS", member: "Budi Santoso" },
  { email: "bendahara@basecamp-rw05.test", role: "BENDAHARA", member: "Anisa Wulandari" },
  { email: "panitia@basecamp-rw05.test", role: "PANITIA", member: "Galih Prasetyo" },
  { email: "anggota@basecamp-rw05.test", role: "ANGGOTA", member: "Arif Wibowo" },
];

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } });

const { data: org, error: orgErr } = await admin.from("organizations").select("id").eq("slug", slug).single();
if (orgErr || !org) throw new Error(`Organisasi "${slug}" belum ada. Jalankan migration & seed dulu.`);

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;

for (const d of DEMO) {
  const { data: member } = await admin.from("members").select("id,name").eq("organization_id", org.id).eq("name", d.member).single();
  let user = list.users.find((u) => u.email === d.email);
  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { full_name: d.member } });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email: d.email, password, email_confirm: true, user_metadata: { full_name: d.member } });
    if (error) throw error;
    user = data.user;
  }
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, organization_id: org.id, member_id: member?.id ?? null, full_name: d.member, role: d.role }, { onConflict: "id" });
  if (pErr) throw pErr;
  console.log(`✓ ${d.role.padEnd(11)} ${d.email}  →  ${d.member}`);
}
console.log("\nSelesai. Password semua akun = nilai DEMO_PASSWORD di .env.local.");
