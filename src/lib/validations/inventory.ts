import { z } from "zod";

export const CONDITIONS = ["EXCELLENT", "GOOD", "FAIR", "DAMAGED", "LOST"] as const;

export const itemSchema = z.object({
  name: z.string().trim().min(2, "Nama barang minimal 2 karakter.").max(120),
  unit_prefix: z
    .string()
    .trim()
    .regex(/^[A-Z]{2,5}$/, "Prefix kode unit 2–5 huruf kapital, contoh: TND."),
  asset_code: z
    .string()
    .trim()
    .max(30)
    .regex(/^[A-Z0-9-]*$/, "Kode aset hanya huruf besar, angka, dan tanda minus.")
    .optional(),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).optional(),
  unit_label: z.string().trim().min(1).max(20),
  purchase_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  purchase_price: z.number().min(0, "Harga tidak boleh negatif.").max(999_999_999_999).nullable().optional(),
  location: z.string().max(120).optional(),
  initial_quantity: z.number().int("Jumlah harus bilangan bulat.").min(0, "Jumlah tidak boleh negatif.").max(500, "Maksimal 500 unit sekali tambah."),
  initial_condition: z.enum(["EXCELLENT", "GOOD", "FAIR"]),
});
export type ItemInput = z.infer<typeof itemSchema>;

export const addUnitsSchema = z.object({
  quantity: z.number().int().min(1, "Minimal 1 unit.").max(500, "Maksimal 500 unit."),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR"]),
});

export const inventoryCategorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter.").max(60),
  description: z.string().max(200).optional(),
});
