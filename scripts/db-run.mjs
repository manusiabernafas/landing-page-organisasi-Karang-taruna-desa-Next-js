// Jalankan file SQL ke database Supabase (migration / seed), masing-masing dalam satu transaksi.
// Pakai: npm run db:run -- supabase/migrations/2026....sql [file lain...]
// Butuh SUPABASE_DB_URL di .env.local (connection string Session pooler).
import fs from "node:fs";
import pg from "pg";

const raw = process.env.SUPABASE_DB_URL ?? "";
// Diparse manual agar password berisi karakter seperti ? atau # tetap aman.
const m = raw.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@:/]+):(\d+)\/(\w+)$/);
if (!m) throw new Error("SUPABASE_DB_URL belum diisi atau formatnya tidak dikenali.");
let password = m[2];
try { password = decodeURIComponent(password); } catch {}
const client = new pg.Client({ user: m[1], password, host: m[3], port: Number(m[4]), database: m[5], ssl: { rejectUnauthorized: false } });
await client.connect();
for (const file of process.argv.slice(2)) {
  const sql = fs.readFileSync(file, "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("OK  ", file);
  } catch (e) {
    await client.query("rollback");
    console.error("GAGAL", file, "->", e.message, e.position ? `(posisi ${e.position})` : "");
    const pos = Number(e.position);
    if (pos) console.error("  dekat:", JSON.stringify(sql.slice(Math.max(0, pos - 120), pos + 60)));
    await client.end();
    process.exit(1);
  }
}
await client.end();
