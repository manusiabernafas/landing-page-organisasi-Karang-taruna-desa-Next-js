import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi.");

export const borrowingSchema = z
  .object({
    borrower_member_id: z.string().uuid().nullable().optional(),
    borrower_name: z.string().trim().min(2, "Nama peminjam wajib diisi.").max(120),
    borrower_phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^[0-9+\-\s]*$/, "Nomor HP hanya angka.")
      .optional(),
    purpose: z.string().trim().min(3, "Keperluan wajib diisi.").max(300),
    event_id: z.string().uuid().nullable().optional(),
    borrow_date: dateStr,
    expected_return_date: dateStr,
    notes: z.string().max(500).optional(),
    unit_ids: z.array(z.string().uuid()).min(1, "Pilih minimal satu unit barang.").max(300, "Maksimal 300 unit per peminjaman."),
    auto_approve: z.boolean(),
  })
  .refine((v) => v.expected_return_date >= v.borrow_date, { path: ["expected_return_date"], message: "Tanggal kembali tidak boleh sebelum tanggal pinjam." });
export type BorrowingInput = z.infer<typeof borrowingSchema>;

export const returnSchema = z.object({
  return_date: dateStr,
  items: z
    .array(
      z.object({
        unit_id: z.string().uuid(),
        condition_after: z.enum(["EXCELLENT", "GOOD", "FAIR", "DAMAGED", "LOST"], { message: "Kondisi setelah pinjam wajib diisi." }),
        notes: z.string().max(300).optional(),
      }),
    )
    .min(1),
});
export type ReturnInput = z.infer<typeof returnSchema>;
