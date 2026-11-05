import { z } from "zod";

export const memberSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  nickname: z.string().trim().max(40).optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s]*$/, "Nomor HP hanya angka.")
    .optional(),
  address: z.string().trim().max(300).optional(),
  join_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal bergabung wajib diisi."),
  role: z.enum(["KETUA", "WAKIL", "SEKRETARIS", "BENDAHARA", "KOORDINATOR", "ANGGOTA"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  bio: z.string().trim().max(500).optional(),
});
export type MemberInput = z.infer<typeof memberSchema>;
