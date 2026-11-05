import { z } from "zod";

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Tanggal & jam wajib diisi.");
const optionalInt = z
  .number()
  .int("Harus bilangan bulat.")
  .min(0, "Tidak boleh negatif.")
  .max(100000, "Terlalu besar.")
  .nullable()
  .optional();

export const eventSchema = z
  .object({
    name: z.string().trim().min(3, "Nama event minimal 3 karakter.").max(160),
    kind: z.enum(["EVENT", "KEGIATAN"]),
    description: z.string().max(3000).optional(),
    location: z.string().max(200).optional(),
    start_date: localDateTime,
    end_date: localDateTime,
    status: z.enum(["DRAFT", "PLANNING", "READY", "ONGOING", "COMPLETED", "CANCELLED"]),
    budget: z.number({ message: "Budget wajib diisi (boleh 0)." }).min(0, "Budget tidak boleh negatif.").max(999_999_999_999),
    target_participant: optionalInt,
    actual_participant: optionalInt,
    is_public: z.boolean(),
  })
  .refine((v) => v.end_date >= v.start_date, { path: ["end_date"], message: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
export type EventInput = z.infer<typeof eventSchema>;

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Judul quest minimal 2 karakter.").max(200),
  assignee_member_id: z.string().uuid().nullable().optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const scheduleSchema = z
  .object({
    title: z.string().trim().min(2, "Judul acara minimal 2 karakter.").max(200),
    start_at: localDateTime,
    end_at: z.string().optional(),
    location: z.string().max(200).optional(),
    pic: z.string().max(120).optional(),
  })
  .refine((v) => !v.end_at || v.end_at >= v.start_at, { path: ["end_at"], message: "Jam selesai tidak boleh sebelum jam mulai." });
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const committeeSchema = z.object({
  member_id: z.string().uuid("Pilih anggota."),
  committee_role: z.string().trim().min(2, "Peran panitia wajib diisi.").max(80),
  division: z.string().max(60).optional(),
});
export type CommitteeInput = z.infer<typeof committeeSchema>;
