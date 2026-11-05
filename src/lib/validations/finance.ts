import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi.");

export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"], { message: "Jenis transaksi wajib dipilih." }),
    transaction_date: dateStr,
    category_id: z.string().optional(),
    amount: z
      .number({ message: "Nominal wajib diisi." })
      .finite("Nominal belum valid.")
      .gt(0, "Nominal harus lebih dari 0.")
      .max(999_999_999_999, "Nominal terlalu besar.")
      .refine((v) => Math.round(v * 100) === v * 100, "Maksimal 2 angka desimal."),
    account_id: z.string().uuid("Akun kas wajib dipilih."),
    to_account_id: z.string().optional(),
    description: z.string().max(500, "Keterangan maksimal 500 karakter.").optional(),
    payment_method: z.enum(["CASH", "TRANSFER", "QRIS", "EWALLET", "OTHER"]),
    transaction_code: z
      .string()
      .max(40)
      .regex(/^[A-Z0-9-]*$/, "Kode hanya huruf besar, angka, dan tanda minus.")
      .optional(),
    is_public: z.boolean(),
    approve_now: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type !== "TRANSFER" && !v.category_id) {
      ctx.addIssue({ code: "custom", path: ["category_id"], message: "Kategori wajib dipilih." });
    }
    if (v.type === "TRANSFER") {
      if (!v.to_account_id) ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Akun tujuan wajib dipilih." });
      else if (v.to_account_id === v.account_id) ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Akun tujuan harus berbeda." });
    }
  });
export type TransactionInput = z.infer<typeof transactionSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter.").max(60),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna belum valid."),
  description: z.string().max(200).optional(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const accountSchema = z.object({
  name: z.string().trim().min(2, "Nama akun minimal 2 karakter.").max(80),
  type: z.enum(["CASH", "BANK", "EWALLET"]),
  description: z.string().max(200).optional(),
});
export type AccountInput = z.infer<typeof accountSchema>;
