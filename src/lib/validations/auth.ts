import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi.").email("Format email belum benar."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi.").email("Format email belum benar."),
});

export const resetSchema = z
  .object({
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Konfirmasi password belum sama." });
